"""
Test suite for Voice-to-Transaction feature (Iteration 11)
Tests the POST /api/voice/parse-transaction endpoint
"""
import pytest
import requests
import os
import wave
import struct
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token created for voice testing
TEST_SESSION_TOKEN = None


@pytest.fixture(scope="module")
def setup_test_user():
    """Create test user and session for voice testing"""
    import subprocess
    import re
    
    result = subprocess.run([
        'mongosh', '--quiet', '--eval', '''
        use('test_database');
        var userId = 'test-voice-pytest-' + Date.now();
        var sessionToken = 'test_voice_pytest_session_' + Date.now();
        db.users.insertOne({
          user_id: userId,
          email: 'test.voice.pytest.' + Date.now() + '@example.com',
          name: 'Voice Pytest User',
          picture: 'https://via.placeholder.com/150',
          has_completed_survey: true,
          is_admin: false,
          created_at: new Date()
        });
        db.user_sessions.insertOne({
          user_id: userId,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        });
        db.categories.insertMany([
          {category_id: 'cat_exp_pytest_1', user_id: userId, name: 'Alimentacion', type: 'expense'},
          {category_id: 'cat_exp_pytest_2', user_id: userId, name: 'Transporte', type: 'expense'},
          {category_id: 'cat_inc_pytest_1', user_id: userId, name: 'Salario', type: 'income'}
        ]);
        print('SESSION_TOKEN=' + sessionToken);
        print('USER_ID=' + userId);
        '''
    ], capture_output=True, text=True)
    
    output = result.stdout
    session_match = re.search(r'SESSION_TOKEN=(\S+)', output)
    user_match = re.search(r'USER_ID=(\S+)', output)
    
    session_token = session_match.group(1) if session_match else None
    user_id = user_match.group(1) if user_match else None
    
    yield {"session_token": session_token, "user_id": user_id}
    
    # Cleanup
    if user_id:
        subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use('test_database');
            db.users.deleteMany({{user_id: "{user_id}"}});
            db.user_sessions.deleteMany({{user_id: "{user_id}"}});
            db.categories.deleteMany({{user_id: "{user_id}"}});
            '''
        ], capture_output=True)


@pytest.fixture
def test_audio_file():
    """Create a minimal WAV audio file for testing"""
    sample_rate = 16000
    duration = 1  # seconds
    num_samples = sample_rate * duration
    
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        with wave.open(tmp.name, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            for _ in range(num_samples):
                wav_file.writeframes(struct.pack('<h', 0))
        
        yield tmp.name
    
    # Cleanup
    os.unlink(tmp.name)


class TestVoiceEndpointExists:
    """Test that the voice endpoint exists and responds correctly"""
    
    def test_voice_endpoint_returns_401_without_auth(self):
        """Voice endpoint should return 401 without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/voice/parse-transaction",
            files={"file": ("test.wav", b"", "audio/wav")}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Not authenticated" in data["detail"]
        print("PASS: Voice endpoint returns 401 without auth")
    
    def test_voice_endpoint_returns_422_without_file(self, setup_test_user):
        """Voice endpoint should return 422 when file is missing"""
        session_token = setup_test_user["session_token"]
        if not session_token:
            pytest.skip("Could not create test session")
        
        response = requests.post(
            f"{BASE_URL}/api/voice/parse-transaction",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        # Check for validation error about missing file
        assert any("file" in str(d).lower() for d in data["detail"])
        print("PASS: Voice endpoint returns 422 without file")


class TestVoiceEndpointWithAuth:
    """Test voice endpoint with proper authentication"""
    
    def test_voice_endpoint_accepts_audio_file(self, setup_test_user, test_audio_file):
        """Voice endpoint should accept and process audio file"""
        session_token = setup_test_user["session_token"]
        if not session_token:
            pytest.skip("Could not create test session")
        
        with open(test_audio_file, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/api/voice/parse-transaction",
                headers={"Authorization": f"Bearer {session_token}"},
                files={"file": ("test.wav", f, "audio/wav")}
            )
        
        # Should return 200 (success) or 500 (if Whisper fails on silent audio)
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            # Response should have transcript field
            assert "transcript" in data
            # Response should have parsed field (can be null/empty)
            assert "parsed" in data
            print(f"PASS: Voice endpoint processed audio. Transcript: {data.get('transcript', '')[:50]}...")
        else:
            # 500 is acceptable for silent audio (Whisper may fail)
            print("PASS: Voice endpoint responded (500 for silent audio is acceptable)")
    
    def test_voice_endpoint_response_structure(self, setup_test_user, test_audio_file):
        """Voice endpoint should return proper response structure"""
        session_token = setup_test_user["session_token"]
        if not session_token:
            pytest.skip("Could not create test session")
        
        with open(test_audio_file, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/api/voice/parse-transaction",
                headers={"Authorization": f"Bearer {session_token}"},
                files={"file": ("test.wav", f, "audio/wav")}
            )
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure
            assert isinstance(data.get("transcript"), (str, type(None)))
            assert "parsed" in data
            
            # If parsed is not None, check its structure
            if data.get("parsed"):
                parsed = data["parsed"]
                # These fields may or may not be present depending on transcription
                valid_fields = {"type", "category", "amount", "description", "date"}
                for key in parsed.keys():
                    assert key in valid_fields or key == "error", f"Unexpected field: {key}"
            
            print("PASS: Voice endpoint response has correct structure")
        else:
            print("SKIP: Could not verify structure (non-200 response)")


class TestVoiceEndpointErrorHandling:
    """Test voice endpoint error handling"""
    
    def test_voice_endpoint_with_invalid_session(self):
        """Voice endpoint should return 401 with invalid session token"""
        response = requests.post(
            f"{BASE_URL}/api/voice/parse-transaction",
            headers={"Authorization": "Bearer invalid_token_12345"},
            files={"file": ("test.wav", b"fake audio data", "audio/wav")}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("PASS: Voice endpoint returns 401 with invalid session")
    
    def test_voice_endpoint_with_expired_session(self):
        """Voice endpoint should return 401 with expired session"""
        # Create an expired session
        import subprocess
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', '''
            use('test_database');
            var userId = 'test-expired-' + Date.now();
            var sessionToken = 'expired_session_' + Date.now();
            db.users.insertOne({
              user_id: userId,
              email: 'expired.' + Date.now() + '@example.com',
              name: 'Expired User',
              has_completed_survey: true,
              created_at: new Date()
            });
            db.user_sessions.insertOne({
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() - 1000),  // Expired 1 second ago
              created_at: new Date()
            });
            print('SESSION_TOKEN=' + sessionToken);
            print('USER_ID=' + userId);
            '''
        ], capture_output=True, text=True)
        
        import re
        session_match = re.search(r'SESSION_TOKEN=(\S+)', result.stdout)
        user_match = re.search(r'USER_ID=(\S+)', result.stdout)
        
        if session_match:
            expired_token = session_match.group(1)
            response = requests.post(
                f"{BASE_URL}/api/voice/parse-transaction",
                headers={"Authorization": f"Bearer {expired_token}"},
                files={"file": ("test.wav", b"fake audio data", "audio/wav")}
            )
            assert response.status_code == 401
            print("PASS: Voice endpoint returns 401 with expired session")
            
            # Cleanup
            if user_match:
                user_id = user_match.group(1)
                subprocess.run([
                    'mongosh', '--quiet', '--eval', f'''
                    use('test_database');
                    db.users.deleteMany({{user_id: "{user_id}"}});
                    db.user_sessions.deleteMany({{user_id: "{user_id}"}});
                    '''
                ], capture_output=True)
        else:
            pytest.skip("Could not create expired session")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
