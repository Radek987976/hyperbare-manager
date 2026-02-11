#!/usr/bin/env python3
"""
Debug test for preventive intervention date update issue
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://34f0186c-058c-4dac-989a-84c340f956ee.preview.emergentagent.com/api"
AUTH_EMAIL = "admin@hypermaint.fr"
AUTH_PASSWORD = "admin123"

def debug_preventive_intervention():
    session = requests.Session()
    
    # Authenticate
    auth_response = session.post(f"{BASE_URL}/auth/login", json={
        "email": AUTH_EMAIL,
        "password": AUTH_PASSWORD
    })
    
    if auth_response.status_code != 200:
        print(f"❌ Authentication failed: {auth_response.status_code}")
        return
    
    token = auth_response.json().get('access_token')
    session.headers.update({'Authorization': f'Bearer {token}'})
    print("✅ Authenticated successfully")
    
    # Create a test inspection
    inspection_data = {
        "titre": "Debug Preventive Maintenance Test",
        "type_controle": "maintenance_preventive",
        "periodicite": "mensuel",
        "date_realisation": "2025-01-15"
    }
    
    insp_response = session.post(f"{BASE_URL}/inspections", json=inspection_data)
    if insp_response.status_code != 200:
        print(f"❌ Failed to create inspection: {insp_response.status_code}")
        print(insp_response.text)
        return
    
    inspection = insp_response.json()
    inspection_id = inspection.get('id')
    original_date_validite = inspection.get('date_validite')
    print(f"✅ Created inspection {inspection_id}")
    print(f"📅 Original date_validite: {original_date_validite}")
    
    # Create preventive intervention
    intervention_data = {
        "type_intervention": "preventive",
        "maintenance_preventive_id": inspection_id,
        "date_intervention": "2025-02-11",
        "technicien": "Debug Technician",
        "actions_realisees": "Debug maintenance préventive réalisée"
    }
    
    print(f"🔧 Creating preventive intervention with data: {json.dumps(intervention_data, indent=2)}")
    
    intervention_response = session.post(f"{BASE_URL}/interventions", json=intervention_data)
    if intervention_response.status_code != 200:
        print(f"❌ Failed to create intervention: {intervention_response.status_code}")
        print(intervention_response.text)
        return
    
    intervention = intervention_response.json()
    intervention_id = intervention.get('id')
    print(f"✅ Created intervention {intervention_id}")
    
    # Check if inspection was updated
    updated_insp_response = session.get(f"{BASE_URL}/inspections/{inspection_id}")
    if updated_insp_response.status_code != 200:
        print(f"❌ Failed to get updated inspection: {updated_insp_response.status_code}")
        return
    
    updated_inspection = updated_insp_response.json()
    new_date_validite = updated_inspection.get('date_validite')
    new_date_realisation = updated_inspection.get('date_realisation')
    
    print(f"📅 Updated date_realisation: {new_date_realisation}")
    print(f"📅 Updated date_validite: {new_date_validite}")
    
    if new_date_validite != original_date_validite:
        print("✅ Date validité was updated successfully!")
    else:
        print("❌ Date validité was NOT updated")
        print("🔍 Debugging info:")
        print(f"   Original inspection: {json.dumps(inspection, indent=2)}")
        print(f"   Updated inspection: {json.dumps(updated_inspection, indent=2)}")
    
    # Cleanup
    session.delete(f"{BASE_URL}/inspections/{inspection_id}")
    print(f"🧹 Cleaned up inspection {inspection_id}")

if __name__ == "__main__":
    debug_preventive_intervention()