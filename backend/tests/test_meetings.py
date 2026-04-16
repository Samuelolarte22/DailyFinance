"""
Test suite for Meeting/Appointment Scheduling Feature
Tests: Admin meeting CRUD operations and user meeting retrieval
"""
import pytest
import requests
import os
import subprocess
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Generate unique test data
TIMESTAMP = int(datetime.now().timestamp() * 1000)
TEST_USER_ID = f"test-user-meeting-{TIMESTAMP}"
TEST_ADMIN_ID = f"test-admin-meeting-{TIMESTAMP}"
TEST_SESSION_TOKEN = f"test_session_user_{TIMESTAMP}"
TEST_ADMIN_SESSION_TOKEN = f"test_session_admin_{TIMESTAMP}"
TEST_MEETING_ID = None


def setup_module(module):
    """Create test user and admin with sessions directly in MongoDB"""
    global TEST_USER_ID, TEST_ADMIN_ID, TEST_SESSION_TOKEN, TEST_ADMIN_SESSION_TOKEN
    
    # Create test user
    user_script = f'''
    use("test_database");
    db.users.insertOne({{
        user_id: "{TEST_USER_ID}",
        email: "test.user.meeting.{TIMESTAMP}@example.com",
        name: "Test Meeting User",
        picture: null,
        has_completed_survey: true,
        is_admin: false,
        created_at: new Date()
    }});
    db.user_sessions.insertOne({{
        user_id: "{TEST_USER_ID}",
        session_token: "{TEST_SESSION_TOKEN}",
        expires_at: new Date(Date.now() + 7*24*60*60*1000),
        created_at: new Date()
    }});
    '''
    result = subprocess.run(['mongosh', '--quiet', '--eval', user_script], capture_output=True, text=True)
    print(f"User setup: {result.stdout} {result.stderr}")
    
    # Create test admin
    admin_script = f'''
    use("test_database");
    db.users.insertOne({{
        user_id: "{TEST_ADMIN_ID}",
        email: "test.admin.meeting.{TIMESTAMP}@example.com",
        name: "Test Meeting Admin",
        picture: null,
        has_completed_survey: true,
        is_admin: true,
        created_at: new Date()
    }});
    db.user_sessions.insertOne({{
        user_id: "{TEST_ADMIN_ID}",
        session_token: "{TEST_ADMIN_SESSION_TOKEN}",
        expires_at: new Date(Date.now() + 7*24*60*60*1000),
        created_at: new Date()
    }});
    '''
    result = subprocess.run(['mongosh', '--quiet', '--eval', admin_script], capture_output=True, text=True)
    print(f"Admin setup: {result.stdout} {result.stderr}")
    print(f"Test setup complete - User: {TEST_USER_ID}, Admin: {TEST_ADMIN_ID}")
    print(f"User token: {TEST_SESSION_TOKEN}, Admin token: {TEST_ADMIN_SESSION_TOKEN}")


def teardown_module(module):
    """Cleanup test data after all tests"""
    cleanup_script = f'''
    use("test_database");
    db.users.deleteMany({{user_id: {{$in: ["{TEST_USER_ID}", "{TEST_ADMIN_ID}"]}} }});
    db.user_sessions.deleteMany({{session_token: {{$in: ["{TEST_SESSION_TOKEN}", "{TEST_ADMIN_SESSION_TOKEN}"]}} }});
    db.meetings.deleteMany({{user_id: "{TEST_USER_ID}"}});
    db.notifications.deleteMany({{user_id: "{TEST_USER_ID}"}});
    '''
    subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)
    print(f"Cleaned up test data for user {TEST_USER_ID} and admin {TEST_ADMIN_ID}")


class TestAdminCreateMeeting:
    """Test POST /api/admin/users/{user_id}/meetings - Admin creates meeting"""
    
    def test_admin_create_meeting_success(self):
        """Admin can create a meeting for a user"""
        global TEST_MEETING_ID
        
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        meeting_data = {
            "title": "Asesoria financiera mensual",
            "description": "Revision de presupuesto y metas",
            "date": future_date,
            "time": "10:00",
            "duration_minutes": 60,
            "is_recurring": False,
            "recurrence": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            json=meeting_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "meeting_id" in data, "Response should contain meeting_id"
        assert data["message"] == "Reunion agendada"
        
        TEST_MEETING_ID = data["meeting_id"]
        print(f"Created meeting: {TEST_MEETING_ID}")
    
    def test_admin_create_recurring_meeting(self):
        """Admin can create a recurring weekly meeting"""
        future_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        meeting_data = {
            "title": "Seguimiento semanal",
            "description": "Revision de gastos semanales",
            "date": future_date,
            "time": "14:30",
            "duration_minutes": 30,
            "is_recurring": True,
            "recurrence": "weekly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            json=meeting_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "meeting_id" in data
        print(f"Created recurring meeting: {data['meeting_id']}")
    
    def test_admin_create_meeting_monthly_recurrence(self):
        """Admin can create a monthly recurring meeting"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        meeting_data = {
            "title": "Revision mensual",
            "date": future_date,
            "time": "09:00",
            "duration_minutes": 90,
            "is_recurring": True,
            "recurrence": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            json=meeting_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "meeting_id" in data
    
    def test_non_admin_cannot_create_meeting(self):
        """Non-admin user cannot create meetings"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        meeting_data = {
            "title": "Unauthorized meeting",
            "date": future_date,
            "time": "10:00",
            "duration_minutes": 60
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            json=meeting_data,
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
    
    def test_create_meeting_for_nonexistent_user(self):
        """Cannot create meeting for non-existent user"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        meeting_data = {
            "title": "Meeting for ghost",
            "date": future_date,
            "time": "10:00",
            "duration_minutes": 60
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/nonexistent-user-12345/meetings",
            json=meeting_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 404


class TestAdminGetUserMeetings:
    """Test GET /api/admin/users/{user_id}/meetings - Admin gets user meetings"""
    
    def test_admin_get_user_meetings(self):
        """Admin can retrieve all meetings for a user"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 meeting"
        
        # Verify meeting structure
        meeting = data[0]
        assert "meeting_id" in meeting
        assert "user_id" in meeting
        assert "title" in meeting
        assert "date" in meeting
        assert "time" in meeting
        assert "duration_minutes" in meeting
        assert "status" in meeting
        print(f"Found {len(data)} meetings for user")
    
    def test_non_admin_cannot_get_user_meetings(self):
        """Non-admin cannot access admin meetings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 403


class TestAdminUpdateMeeting:
    """Test PUT /api/admin/meetings/{meeting_id} - Admin updates meeting"""
    
    def test_admin_update_meeting_title(self):
        """Admin can update meeting title"""
        update_data = {
            "title": "Asesoria financiera actualizada"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/meetings/{TEST_MEETING_ID}",
            json=update_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["message"] == "Reunion actualizada"
    
    def test_admin_update_meeting_time(self):
        """Admin can update meeting time and date"""
        new_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        update_data = {
            "date": new_date,
            "time": "15:00",
            "duration_minutes": 90
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/meetings/{TEST_MEETING_ID}",
            json=update_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
    
    def test_admin_update_meeting_recurrence(self):
        """Admin can change meeting to recurring"""
        update_data = {
            "is_recurring": True,
            "recurrence": "weekly"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/meetings/{TEST_MEETING_ID}",
            json=update_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
    
    def test_update_nonexistent_meeting(self):
        """Cannot update non-existent meeting"""
        update_data = {"title": "Ghost meeting"}
        
        response = requests.put(
            f"{BASE_URL}/api/admin/meetings/nonexistent-meeting-12345",
            json=update_data,
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 404
    
    def test_update_meeting_empty_body(self):
        """Cannot update meeting with empty body"""
        response = requests.put(
            f"{BASE_URL}/api/admin/meetings/{TEST_MEETING_ID}",
            json={},
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 400


class TestAdminCancelMeeting:
    """Test DELETE /api/admin/meetings/{meeting_id} - Admin cancels meeting"""
    
    def test_admin_cancel_meeting(self):
        """Admin can cancel a meeting (sets status to cancelled)"""
        # First create a meeting to cancel
        future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        create_response = requests.post(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            json={
                "title": "Meeting to cancel",
                "date": future_date,
                "time": "11:00",
                "duration_minutes": 30
            },
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        assert create_response.status_code == 200, f"Failed to create meeting: {create_response.text}"
        meeting_to_cancel = create_response.json()["meeting_id"]
        
        # Cancel the meeting
        response = requests.delete(
            f"{BASE_URL}/api/admin/meetings/{meeting_to_cancel}",
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Reunion cancelada"
        
        # Verify meeting status is cancelled
        meetings_response = requests.get(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        meetings = meetings_response.json()
        cancelled_meeting = next((m for m in meetings if m["meeting_id"] == meeting_to_cancel), None)
        assert cancelled_meeting is not None
        assert cancelled_meeting["status"] == "cancelled"
        print(f"Meeting {meeting_to_cancel} status: {cancelled_meeting['status']}")
    
    def test_cancel_nonexistent_meeting(self):
        """Cannot cancel non-existent meeting"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/meetings/nonexistent-meeting-12345",
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 404


class TestUserGetMeetings:
    """Test GET /api/meetings - User gets their upcoming meetings"""
    
    def test_user_get_upcoming_meetings(self):
        """User can get their upcoming scheduled meetings"""
        response = requests.get(
            f"{BASE_URL}/api/meetings",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All returned meetings should be scheduled (not cancelled) and in the future
        for meeting in data:
            assert meeting["status"] == "scheduled", f"Meeting {meeting['meeting_id']} should be scheduled"
            assert "title" in meeting
            assert "date" in meeting
            assert "time" in meeting
            assert "duration_minutes" in meeting
        
        print(f"User has {len(data)} upcoming meetings")
    
    def test_user_meetings_excludes_cancelled(self):
        """User meetings endpoint excludes cancelled meetings"""
        response = requests.get(
            f"{BASE_URL}/api/meetings",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # None of the returned meetings should be cancelled
        cancelled_meetings = [m for m in data if m.get("status") == "cancelled"]
        assert len(cancelled_meetings) == 0, "Cancelled meetings should not be returned"
    
    def test_unauthenticated_cannot_get_meetings(self):
        """Unauthenticated user cannot get meetings"""
        response = requests.get(f"{BASE_URL}/api/meetings")
        
        assert response.status_code == 401


class TestMeetingDataIntegrity:
    """Test meeting data structure and integrity"""
    
    def test_meeting_has_all_required_fields(self):
        """Verify meeting document has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/meetings",
            headers={"Authorization": f"Bearer {TEST_ADMIN_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        meetings = response.json()
        
        if len(meetings) > 0:
            meeting = meetings[0]
            required_fields = [
                "meeting_id", "user_id", "admin_id", "title", 
                "date", "time", "duration_minutes", "status", "created_at"
            ]
            for field in required_fields:
                assert field in meeting, f"Meeting should have {field} field"
    
    def test_meeting_notification_created(self):
        """Verify notification is created when meeting is scheduled"""
        # Check notifications for the test user
        check_script = f'''
        use("test_database");
        var notifs = db.notifications.find({{user_id: "{TEST_USER_ID}", type: "meeting_scheduled"}}).toArray();
        print(notifs.length);
        '''
        result = subprocess.run(['mongosh', '--quiet', '--eval', check_script], capture_output=True, text=True)
        
        # Should have at least one meeting notification
        try:
            count = int(result.stdout.strip().split('\n')[-1])
        except:
            count = 0
        assert count >= 1, f"Expected at least 1 meeting notification, found {count}"
        print(f"Found {count} meeting notifications for user")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
