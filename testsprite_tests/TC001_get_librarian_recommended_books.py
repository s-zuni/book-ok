import requests
from requests.auth import HTTPBasicAuth

def test_get_librarian_recommended_books():
    base_url = "http://localhost:3000"
    endpoint = "/api/librarian-books"
    url = base_url + endpoint
    auth = HTTPBasicAuth("zxzx729@gmail.com", "lsj103820@")
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, auth=auth, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_data = response.json()
        assert isinstance(json_data, dict), "Response is not a JSON object"
        assert "response" in json_data, "'response' key not in JSON"
        assert isinstance(json_data["response"], dict), "'response' key does not contain an object"
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_get_librarian_recommended_books()