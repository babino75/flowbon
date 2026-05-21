import urllib.request
import json

# Get Titi's token
req = urllib.request.Request("http://172.18.0.4:8000/auth/login", data=b"username=titi@flowbon.com&password=password", headers={"Content-Type": "application/x-www-form-urlencoded"})
try:
    with urllib.request.urlopen(req) as response:
        token = json.loads(response.read())["access_token"]
        print("Token obtained")
        
        # Call dashboard summary
        req2 = urllib.request.Request("http://172.18.0.4:8000/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req2) as res2:
            print(res2.read().decode())
except Exception as e:
    print(f"Error: {e}")
