import requests

def test_get_librarian_recommended_books():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/librarian-books"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(json_data, dict), "Response JSON is not an object"
    assert "response" in json_data, "'response' key not found in JSON"
    assert isinstance(json_data["response"], dict), "'response' is not an object"

test_get_librarian_recommended_books()