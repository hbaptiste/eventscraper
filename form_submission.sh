# First get a CSRF token
TOKEN=$(curl -s -X GET "http://localhost:5173/api/csrfToken" | jq -r '.csrf_token')

echo "TOKEN:: $TOKEN"
# Submit form with the token
curl -X POST "http://localhost:5173/api/submissions" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Origin: http://localhost:5173" \
  -d '{
        "formData":{
            "title": "",
            "subtitle": "",
            "place": "",
            "price": "",
            "description": "This is a test submission",
            "address": "Kromae 12",
            "venuename": "strange",
            "startdate": "2025-07-05",
            "enddate": "2025-07-06",
            "starttime": "20:00",
            "endtime": "21:00",
            "category": "theatre"
        },
        "email": "harris.baptiste@gmail.com",
        "token": ""
  }' \
  -v