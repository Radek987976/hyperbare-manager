#!/usr/bin/env python3
"""
HyperMaint GMAO Backend API Testing Suite
Tests all new features including equipment types, sub-equipments, interventions, dashboard stats, and exports
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import os

# Configuration
BASE_URL = "https://34f0186c-058c-4dac-989a-84c340f956ee.preview.emergentagent.com/api"
AUTH_EMAIL = "admin@hypermaint.fr"
AUTH_PASSWORD = "admin123"

class HyperMaintTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = []
        self.created_resources = {
            'equipment_types': [],
            'equipments': [],
            'subequipments': [],
            'work_orders': [],
            'interventions': [],
            'inspections': []
        }
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'details': details or {}
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate and get JWT token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": AUTH_EMAIL,
                "password": AUTH_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                self.log_result("Authentication", True, "Successfully authenticated")
                return True
            else:
                self.log_result("Authentication", False, f"Failed with status {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_equipment_types_crud(self):
        """Test Equipment Types CRUD operations"""
        print("\n=== Testing Equipment Types CRUD ===")
        
        # 1. GET equipment types (should return defaults or existing)
        try:
            response = self.session.get(f"{BASE_URL}/equipment-types")
            if response.status_code == 200:
                types = response.json()
                self.log_result("GET Equipment Types", True, f"Retrieved {len(types)} equipment types")
            else:
                self.log_result("GET Equipment Types", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Equipment Types", False, f"Exception: {str(e)}")
        
        # 2. POST new equipment type
        try:
            new_type_data = {
                "nom": "Test Equipment Type",
                "code": "test_equipment_type",
                "description": "Test description for equipment type"
            }
            response = self.session.post(f"{BASE_URL}/equipment-types", json=new_type_data)
            if response.status_code == 200:
                created_type = response.json()
                type_id = created_type.get('id')
                self.created_resources['equipment_types'].append(type_id)
                self.log_result("POST Equipment Type", True, f"Created equipment type with ID: {type_id}")
            else:
                self.log_result("POST Equipment Type", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Equipment Type", False, f"Exception: {str(e)}")
        
        # 3. PUT update equipment type
        if self.created_resources['equipment_types']:
            try:
                type_id = self.created_resources['equipment_types'][0]
                update_data = {
                    "nom": "Updated Test Equipment Type",
                    "code": "test_equipment_type",
                    "description": "Updated description"
                }
                response = self.session.put(f"{BASE_URL}/equipment-types/{type_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("PUT Equipment Type", True, f"Updated equipment type {type_id}")
                else:
                    self.log_result("PUT Equipment Type", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Equipment Type", False, f"Exception: {str(e)}")
        
        # 4. DELETE equipment type (will test later after cleanup)
    
    def test_subequipments_crud(self):
        """Test Sub-Equipments CRUD operations"""
        print("\n=== Testing Sub-Equipments CRUD ===")
        
        # First, get existing equipments to use as parent
        parent_equipment_id = None
        try:
            response = self.session.get(f"{BASE_URL}/equipments")
            if response.status_code == 200:
                equipments = response.json()
                if equipments:
                    parent_equipment_id = equipments[0].get('id')
                    self.log_result("Get Parent Equipment", True, f"Found parent equipment: {parent_equipment_id}")
                else:
                    # Create a test equipment first
                    equipment_data = {
                        "type": "compresseur",
                        "reference": "TEST-COMP-001",
                        "numero_serie": "SN-TEST-001",
                        "criticite": "normale",
                        "statut": "en_service",
                        "caisson_id": "test-caisson-id"
                    }
                    eq_response = self.session.post(f"{BASE_URL}/equipments", json=equipment_data)
                    if eq_response.status_code == 200:
                        parent_equipment_id = eq_response.json().get('id')
                        self.created_resources['equipments'].append(parent_equipment_id)
                        self.log_result("Create Parent Equipment", True, f"Created parent equipment: {parent_equipment_id}")
            else:
                self.log_result("Get Parent Equipment", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Parent Equipment", False, f"Exception: {str(e)}")
        
        if not parent_equipment_id:
            self.log_result("Sub-Equipment Tests", False, "No parent equipment available")
            return
        
        # 1. POST create sub-equipment
        try:
            subequip_data = {
                "nom": "Test Sub-Equipment",
                "reference": "SUB-TEST-001",
                "parent_equipment_id": parent_equipment_id,
                "statut": "en_service",
                "description": "Test sub-equipment description"
            }
            response = self.session.post(f"{BASE_URL}/subequipments", json=subequip_data)
            if response.status_code == 200:
                created_subequip = response.json()
                subequip_id = created_subequip.get('id')
                self.created_resources['subequipments'].append(subequip_id)
                self.log_result("POST Sub-Equipment", True, f"Created sub-equipment with ID: {subequip_id}")
            else:
                self.log_result("POST Sub-Equipment", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST Sub-Equipment", False, f"Exception: {str(e)}")
        
        # 2. GET all sub-equipments
        try:
            response = self.session.get(f"{BASE_URL}/subequipments")
            if response.status_code == 200:
                subequipments = response.json()
                self.log_result("GET Sub-Equipments", True, f"Retrieved {len(subequipments)} sub-equipments")
            else:
                self.log_result("GET Sub-Equipments", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Sub-Equipments", False, f"Exception: {str(e)}")
        
        # 3. GET sub-equipments filtered by parent
        try:
            response = self.session.get(f"{BASE_URL}/subequipments?parent_equipment_id={parent_equipment_id}")
            if response.status_code == 200:
                filtered_subequipments = response.json()
                self.log_result("GET Sub-Equipments Filtered", True, f"Retrieved {len(filtered_subequipments)} sub-equipments for parent")
            else:
                self.log_result("GET Sub-Equipments Filtered", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET Sub-Equipments Filtered", False, f"Exception: {str(e)}")
        
        # 4. PUT update sub-equipment
        if self.created_resources['subequipments']:
            try:
                subequip_id = self.created_resources['subequipments'][0]
                update_data = {
                    "nom": "Updated Test Sub-Equipment",
                    "reference": "SUB-TEST-001-UPDATED",
                    "parent_equipment_id": parent_equipment_id,
                    "statut": "maintenance"
                }
                response = self.session.put(f"{BASE_URL}/subequipments/{subequip_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("PUT Sub-Equipment", True, f"Updated sub-equipment {subequip_id}")
                else:
                    self.log_result("PUT Sub-Equipment", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT Sub-Equipment", False, f"Exception: {str(e)}")
    
    def test_interventions_curative_preventive(self):
        """Test Interventions with curative and preventive types"""
        print("\n=== Testing Interventions (Curative/Preventive) ===")
        
        # First get work orders and inspections
        work_order_id = None
        inspection_id = None
        
        # Get work orders
        try:
            response = self.session.get(f"{BASE_URL}/work-orders")
            if response.status_code == 200:
                work_orders = response.json()
                if work_orders:
                    work_order_id = work_orders[0].get('id')
                    self.log_result("Get Work Orders", True, f"Found {len(work_orders)} work orders")
                else:
                    # Create a test work order
                    wo_data = {
                        "titre": "Test Work Order for Intervention",
                        "description": "Test work order description",
                        "type_maintenance": "corrective",
                        "priorite": "normale",
                        "statut": "planifiee",
                        "date_planifiee": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
                    }
                    wo_response = self.session.post(f"{BASE_URL}/work-orders", json=wo_data)
                    if wo_response.status_code == 200:
                        work_order_id = wo_response.json().get('id')
                        self.created_resources['work_orders'].append(work_order_id)
                        self.log_result("Create Work Order", True, f"Created work order: {work_order_id}")
            else:
                self.log_result("Get Work Orders", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Work Orders", False, f"Exception: {str(e)}")
        
        # Get inspections (maintenance préventive)
        try:
            response = self.session.get(f"{BASE_URL}/inspections")
            if response.status_code == 200:
                inspections = response.json()
                if inspections:
                    inspection_id = inspections[0].get('id')
                    self.log_result("Get Inspections", True, f"Found {len(inspections)} inspections")
                else:
                    # Create a test inspection
                    insp_data = {
                        "titre": "Test Preventive Maintenance",
                        "type_controle": "maintenance_preventive",
                        "periodicite": "mensuel",
                        "date_realisation": datetime.now().strftime("%Y-%m-%d")
                    }
                    insp_response = self.session.post(f"{BASE_URL}/inspections", json=insp_data)
                    if insp_response.status_code == 200:
                        inspection_id = insp_response.json().get('id')
                        self.created_resources['inspections'].append(inspection_id)
                        self.log_result("Create Inspection", True, f"Created inspection: {inspection_id}")
            else:
                self.log_result("Get Inspections", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Inspections", False, f"Exception: {str(e)}")
        
        # Test curative intervention
        if work_order_id:
            try:
                curative_data = {
                    "type_intervention": "curative",
                    "work_order_id": work_order_id,
                    "date_intervention": datetime.now().strftime("%Y-%m-%d"),
                    "technicien": "Test Technician",
                    "actions_realisees": "Test curative action performed"
                }
                response = self.session.post(f"{BASE_URL}/interventions", json=curative_data)
                if response.status_code == 200:
                    intervention = response.json()
                    self.created_resources['interventions'].append(intervention.get('id'))
                    self.log_result("POST Curative Intervention", True, f"Created curative intervention: {intervention.get('id')}")
                else:
                    self.log_result("POST Curative Intervention", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST Curative Intervention", False, f"Exception: {str(e)}")
        
        # Test preventive intervention
        if inspection_id:
            try:
                # Get the inspection first to check its current date_validite
                insp_response = self.session.get(f"{BASE_URL}/inspections/{inspection_id}")
                original_date_validite = None
                if insp_response.status_code == 200:
                    original_date_validite = insp_response.json().get('date_validite')
                
                preventive_data = {
                    "type_intervention": "preventive",
                    "maintenance_preventive_id": inspection_id,
                    "date_intervention": datetime.now().strftime("%Y-%m-%d"),
                    "technicien": "Test Technician",
                    "actions_realisees": "Maintenance préventive réalisée"
                }
                response = self.session.post(f"{BASE_URL}/interventions", json=preventive_data)
                if response.status_code == 200:
                    intervention = response.json()
                    self.created_resources['interventions'].append(intervention.get('id'))
                    self.log_result("POST Preventive Intervention", True, f"Created preventive intervention: {intervention.get('id')}")
                    
                    # Verify that the inspection's date_validite was updated
                    updated_insp_response = self.session.get(f"{BASE_URL}/inspections/{inspection_id}")
                    if updated_insp_response.status_code == 200:
                        updated_inspection = updated_insp_response.json()
                        new_date_validite = updated_inspection.get('date_validite')
                        if new_date_validite != original_date_validite:
                            self.log_result("Preventive Intervention Date Update", True, f"Inspection date_validite updated from {original_date_validite} to {new_date_validite}")
                        else:
                            self.log_result("Preventive Intervention Date Update", False, "Inspection date_validite was not updated")
                else:
                    self.log_result("POST Preventive Intervention", False, f"Status {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST Preventive Intervention", False, f"Exception: {str(e)}")
    
    def test_dashboard_stats_compressors(self):
        """Test Dashboard Stats with Compressors"""
        print("\n=== Testing Dashboard Stats with Compressors ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/dashboard/stats")
            if response.status_code == 200:
                stats = response.json()
                
                # Check if compresseurs array exists
                if 'compresseurs' in stats:
                    compresseurs = stats['compresseurs']
                    self.log_result("Dashboard Stats - Compressors Array", True, f"Found compresseurs array with {len(compresseurs)} items")
                    
                    # Check if compressors have compteur_horaire
                    has_compteur = any('compteur_horaire' in comp for comp in compresseurs)
                    if has_compteur:
                        self.log_result("Dashboard Stats - Compteur Horaire", True, "Compressors include compteur_horaire field")
                    else:
                        self.log_result("Dashboard Stats - Compteur Horaire", False, "Compressors missing compteur_horaire field")
                else:
                    self.log_result("Dashboard Stats - Compressors Array", False, "Missing compresseurs array in stats")
                
                # Check other expected fields
                expected_fields = ['equipment_stats', 'work_order_stats', 'low_stock_count', 'total_spare_parts']
                for field in expected_fields:
                    if field in stats:
                        self.log_result(f"Dashboard Stats - {field}", True, f"Field {field} present")
                    else:
                        self.log_result(f"Dashboard Stats - {field}", False, f"Field {field} missing")
                        
            else:
                self.log_result("Dashboard Stats", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Exception: {str(e)}")
    
    def test_export_endpoints(self):
        """Test Export endpoints"""
        print("\n=== Testing Export Endpoints ===")
        
        # Test CSV export for equipments
        try:
            response = self.session.get(f"{BASE_URL}/export/csv/equipments")
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'csv' in content_type or 'text' in content_type:
                    self.log_result("CSV Export - Equipments", True, f"CSV export successful, content-type: {content_type}")
                else:
                    self.log_result("CSV Export - Equipments", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_result("CSV Export - Equipments", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("CSV Export - Equipments", False, f"Exception: {str(e)}")
        
        # Test JSON export
        try:
            response = self.session.get(f"{BASE_URL}/export/json")
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'json' in content_type:
                    self.log_result("JSON Export", True, f"JSON export successful, content-type: {content_type}")
                else:
                    self.log_result("JSON Export", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_result("JSON Export", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("JSON Export", False, f"Exception: {str(e)}")
        
        # Test SQL export
        try:
            response = self.session.get(f"{BASE_URL}/export/sql")
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'sql' in content_type or 'application' in content_type:
                    self.log_result("SQL Export", True, f"SQL export successful, content-type: {content_type}")
                else:
                    self.log_result("SQL Export", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_result("SQL Export", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("SQL Export", False, f"Exception: {str(e)}")
    
    def test_work_order_delete(self):
        """Test Work Order Delete functionality"""
        print("\n=== Testing Work Order Delete ===")
        
        # Create a work order specifically for deletion test
        try:
            wo_data = {
                "titre": "Work Order for Deletion Test",
                "description": "This work order will be deleted",
                "type_maintenance": "corrective",
                "priorite": "basse",
                "statut": "planifiee",
                "date_planifiee": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
            }
            response = self.session.post(f"{BASE_URL}/work-orders", json=wo_data)
            if response.status_code == 200:
                wo_id = response.json().get('id')
                self.log_result("Create Work Order for Deletion", True, f"Created work order: {wo_id}")
                
                # Now delete it
                delete_response = self.session.delete(f"{BASE_URL}/work-orders/{wo_id}")
                if delete_response.status_code == 200:
                    self.log_result("DELETE Work Order", True, f"Successfully deleted work order: {wo_id}")
                    
                    # Verify it's actually deleted
                    get_response = self.session.get(f"{BASE_URL}/work-orders/{wo_id}")
                    if get_response.status_code == 404:
                        self.log_result("Verify Work Order Deletion", True, "Work order properly deleted (404 on GET)")
                    else:
                        self.log_result("Verify Work Order Deletion", False, f"Work order still exists (status {get_response.status_code})")
                else:
                    self.log_result("DELETE Work Order", False, f"Status {delete_response.status_code}", delete_response.text)
            else:
                self.log_result("Create Work Order for Deletion", False, f"Status {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Work Order Delete Test", False, f"Exception: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n=== Cleaning up test data ===")
        
        # Delete created interventions
        for intervention_id in self.created_resources['interventions']:
            try:
                response = self.session.delete(f"{BASE_URL}/interventions/{intervention_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted intervention: {intervention_id}")
            except:
                pass
        
        # Delete created sub-equipments
        for subequip_id in self.created_resources['subequipments']:
            try:
                response = self.session.delete(f"{BASE_URL}/subequipments/{subequip_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted sub-equipment: {subequip_id}")
            except:
                pass
        
        # Delete created work orders
        for wo_id in self.created_resources['work_orders']:
            try:
                response = self.session.delete(f"{BASE_URL}/work-orders/{wo_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted work order: {wo_id}")
            except:
                pass
        
        # Delete created inspections
        for insp_id in self.created_resources['inspections']:
            try:
                response = self.session.delete(f"{BASE_URL}/inspections/{insp_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted inspection: {insp_id}")
            except:
                pass
        
        # Delete created equipments
        for eq_id in self.created_resources['equipments']:
            try:
                response = self.session.delete(f"{BASE_URL}/equipments/{eq_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted equipment: {eq_id}")
            except:
                pass
        
        # Delete created equipment types
        for type_id in self.created_resources['equipment_types']:
            try:
                response = self.session.delete(f"{BASE_URL}/equipment-types/{type_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted equipment type: {type_id}")
            except:
                pass
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting HyperMaint GMAO Backend API Tests")
        print(f"🔗 Testing against: {BASE_URL}")
        print(f"👤 Authentication: {AUTH_EMAIL}")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_equipment_types_crud()
        self.test_subequipments_crud()
        self.test_interventions_curative_preventive()
        self.test_dashboard_stats_compressors()
        self.test_export_endpoints()
        self.test_work_order_delete()
        
        # Clean up
        self.cleanup_test_data()
        
        # Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result['status'])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result['status'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if "✅ PASS" in result['status']:
                print(f"  - {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = HyperMaintTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)