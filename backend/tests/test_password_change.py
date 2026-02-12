"""
Test suite for password change functionality
- Self-service password change (PUT /api/users/me/change-password)
- Tests: wrong password, correct password, login after change
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@hypermaint.fr"
TEST_PASSWORD = "admin123"
TEMP_PASSWORD = "temppass123"


class TestPasswordChange:
    """Password change endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed with status {response.status_code}")
        
        self.token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
        
        # Teardown: Ensure password is reset to original
        # Try to reset with both passwords in case test failed mid-way
        for current_pwd in [TEMP_PASSWORD, TEST_PASSWORD]:
            try:
                self.session.put(f"{BASE_URL}/api/users/me/change-password", json={
                    "current_password": current_pwd,
                    "new_password": TEST_PASSWORD
                })
            except:
                pass
    
    def test_change_password_wrong_current_password(self):
        """Test: Change password with wrong current password should fail"""
        response = self.session.put(f"{BASE_URL}/api/users/me/change-password", json={
            "current_password": "wrongpassword",
            "new_password": "newpass123"
        })
        
        # Should return 400 Bad Request
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        # Verify error message
        data = response.json()
        assert "detail" in data
        assert "incorrect" in data["detail"].lower() or "actuel" in data["detail"].lower()
        print(f"✓ Wrong password correctly rejected: {data['detail']}")
    
    def test_change_password_success(self):
        """Test: Change password with correct current password should succeed"""
        # Change password
        response = self.session.put(f"{BASE_URL}/api/users/me/change-password", json={
            "current_password": TEST_PASSWORD,
            "new_password": TEMP_PASSWORD
        })
        
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify success message
        data = response.json()
        assert "message" in data
        assert "succès" in data["message"].lower() or "success" in data["message"].lower()
        print(f"✓ Password changed successfully: {data['message']}")
        
        # Verify can login with new password
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEMP_PASSWORD
        })
        
        assert login_response.status_code == 200, "Should be able to login with new password"
        print("✓ Login with new password successful")
        
        # Reset password back
        new_token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {new_token}"})
        
        reset_response = self.session.put(f"{BASE_URL}/api/users/me/change-password", json={
            "current_password": TEMP_PASSWORD,
            "new_password": TEST_PASSWORD
        })
        
        assert reset_response.status_code == 200, "Should be able to reset password"
        print("✓ Password reset to original successful")
    
    def test_change_password_short_password(self):
        """Test: New password too short should fail"""
        response = self.session.put(f"{BASE_URL}/api/users/me/change-password", json={
            "current_password": TEST_PASSWORD,
            "new_password": "abc"  # Too short (< 6 chars)
        })
        
        # Should return 400 Bad Request
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Short password correctly rejected: {data['detail']}")
    
    def test_change_password_without_auth(self):
        """Test: Change password without authentication should fail"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.put(f"{BASE_URL}/api/users/me/change-password", json={
            "current_password": TEST_PASSWORD,
            "new_password": "newpass123"
        })
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated request correctly rejected with status {response.status_code}")
    
    def test_login_after_password_change(self):
        """Test: Full flow - change password, login with new, reset"""
        # Step 1: Change password
        change_response = self.session.put(f"{BASE_URL}/api/users/me/change-password", json={
            "current_password": TEST_PASSWORD,
            "new_password": TEMP_PASSWORD
        })
        assert change_response.status_code == 200
        print("✓ Step 1: Password changed")
        
        # Step 2: Old password should NOT work
        old_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert old_login.status_code == 401, "Old password should not work"
        print("✓ Step 2: Old password correctly rejected")
        
        # Step 3: New password should work
        new_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEMP_PASSWORD
        })
        assert new_login.status_code == 200, "New password should work"
        
        # Verify user data in response
        user_data = new_login.json()
        assert "access_token" in user_data
        assert "user" in user_data
        assert user_data["user"]["email"] == TEST_EMAIL
        print("✓ Step 3: Login with new password successful")
        
        # Step 4: Reset password
        new_token = new_login.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {new_token}"})
        
        reset_response = self.session.put(f"{BASE_URL}/api/users/me/change-password", json={
            "current_password": TEMP_PASSWORD,
            "new_password": TEST_PASSWORD
        })
        assert reset_response.status_code == 200
        print("✓ Step 4: Password reset to original")
        
        # Step 5: Verify original password works again
        final_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert final_login.status_code == 200
        print("✓ Step 5: Original password works again")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
