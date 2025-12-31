import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {
    "Accept": "application/json"
}

def test_search_books_with_query_and_pagination():
    query = "children"
    page = "1"
    params = {
        "query": query,
        "page": page
    }

    try:
        # Test with query and page parameter
        response = requests.get(f"{BASE_URL}/api/search", headers=HEADERS, params=params, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        json_data = response.json()
        assert isinstance(json_data, dict) or isinstance(json_data, list), "Response should be JSON object or array"
        # Check that some results exist and pagination info might be present
        assert json_data, "Response JSON should not be empty"

        # Test with query parameter only (no page)
        params_no_page = {
            "query": query
        }
        response_no_page = requests.get(f"{BASE_URL}/api/search", headers=HEADERS, params=params_no_page, timeout=TIMEOUT)
        assert response_no_page.status_code == 200, f"Expected status code 200 but got {response_no_page.status_code}"
        json_data_no_page = response_no_page.json()
        assert isinstance(json_data_no_page, dict) or isinstance(json_data_no_page, list), "Response should be JSON object or array"
        assert json_data_no_page, "Response JSON should not be empty"

    except requests.exceptions.Timeout:
        assert False, "Request timed out"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_search_books_with_query_and_pagination()