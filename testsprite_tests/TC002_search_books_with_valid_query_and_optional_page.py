import requests
from requests.auth import HTTPBasicAuth

def test_search_books_with_valid_query_and_optional_page():
    base_url = "http://localhost:3000"
    endpoint = "/api/search"
    url = base_url + endpoint
    auth = HTTPBasicAuth("zxzx729@gmail.com", "lsj103820@")
    headers = {"Accept": "application/json"}
    timeout = 30

    # Test case with query only
    params_query_only = {"query": "children"}
    response_query_only = requests.get(url, headers=headers, auth=auth, params=params_query_only, timeout=timeout)
    assert response_query_only.status_code == 200, f"Expected 200, got {response_query_only.status_code}"
    json_data = response_query_only.json()
    assert isinstance(json_data, dict), "Response is not a JSON object"
    # We expect some keys related to search results and pagination - since no schema is detailed,
    # check that results or similar key is present or response is not empty
    assert len(json_data) > 0, "Empty response for search query only"

    # Test case with query and page parameter
    params_query_page = {"query": "adventure", "page": "2"}
    response_query_page = requests.get(url, headers=headers, auth=auth, params=params_query_page, timeout=timeout)
    assert response_query_page.status_code == 200, f"Expected 200, got {response_query_page.status_code}"
    json_data_page = response_query_page.json()
    assert isinstance(json_data_page, dict), "Response is not a JSON object"
    assert len(json_data_page) > 0, "Empty response for search query with page"
    # If the response supports pagination, it might include page info:
    # Just check page param used correctly by presence of some key or count difference if possible (no schema detail)
    # Minimal validation due to lack of schema, just ensure successful response and json body

test_search_books_with_valid_query_and_optional_page()