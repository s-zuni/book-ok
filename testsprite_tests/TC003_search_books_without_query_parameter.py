import requests
from requests.auth import HTTPBasicAuth

def test_search_books_without_query_parameter():
    base_url = "http://localhost:3000"
    endpoint = "/api/search"
    url = base_url + endpoint
    auth = HTTPBasicAuth("zxzx729@gmail.com", "lsj103820@")
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, auth=auth, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # The API requires the 'query' parameter, so it should return an error response due to missing required param.
    # Assert the response status code is 4xx (likely 400 Bad Request)
    assert response.status_code >= 400 and response.status_code < 500, f"Expected 4xx status code, got {response.status_code}"

    # Optionally, check the response contains an error message related to missing query parameter
    try:
        json_resp = response.json()
    except ValueError:
        # Response is not JSON, fail the test
        assert False, "Response is not valid JSON"

    # Expected that the error message or code indicates missing query parameter
    # This depends on API implementation but generally error keys or messages like 'query' or 'missing' appear
    error_found = False
    if isinstance(json_resp, dict):
        # Check typical keys
        error_keys = ['error', 'message', 'detail', 'errors']
        for key in error_keys:
            if key in json_resp:
                val = json_resp[key]
                # Check if message mentions 'query'
                if isinstance(val, str) and "query" in val.lower():
                    error_found = True
                    break
                if isinstance(val, dict):
                    for v in val.values():
                        if isinstance(v, str) and "query" in v.lower():
                            error_found = True
                            break
                if error_found:
                    break

    assert error_found, "Response JSON does not indicate missing required 'query' parameter"

test_search_books_without_query_parameter()