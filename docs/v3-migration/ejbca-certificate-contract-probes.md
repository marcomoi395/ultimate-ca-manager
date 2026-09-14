# EJBCA Certificate Contract Probes

Mục tiêu: lấy contract thực tế từ đúng EJBCA đang chạy. Chỉ dùng các nhóm API được hỗ trợ:

- `/v1/ca/*`
- `/v1/certificate/*`
- `/v2/certificate/*`

## 0. Biến môi trường

Chạy tại repository root:

```bash
export EJBCA_URL='https://127.0.0.1:8444/ejbca/ejbca-rest-api'
export EJBCA_CA_CERT='secrets/ejbca/ca.crt'
export EJBCA_CLIENT_CERT='secrets/ejbca/client.crt'
export EJBCA_CLIENT_KEY='secrets/ejbca/client.key'

# Chỉ dùng -k cho môi trường PoC hiện tại vì certificate local không có SAN cho 127.0.0.1.
export CURL_EJBCA="curl -sk --cert \"$EJBCA_CLIENT_CERT\" --key \"$EJBCA_CLIENT_KEY\""
```

Không ghi username/password thật vào file hoặc shell history.

## 1. Xác định version hiện tại

### Container image và digest

```bash
docker inspect ucm-ejbca --format 'image={{.Config.Image}} digest={{index .RepoDigests 0}}'
```

### Certificate REST status

```bash
$CURL_EJBCA "$EJBCA_URL/v1/certificate/status" | jq .
```

### CA REST status

```bash
$CURL_EJBCA "$EJBCA_URL/v1/ca/status" | jq .
```

Lưu lại toàn bộ output: `status`, `version`, `revision`, image tag, image digest.

## Baseline đã xác minh

Kiểm tra trực tiếp ngày 2026-09-09:

- Image runtime: `keyfactor/ejbca-ce:latest`
- Image digest: `keyfactor/ejbca-ce@sha256:183b86af44b9b13e7cc8912c868f635aeb8dba6bf056ccbd4683b17626964d0a`
- `/v1/certificate/status`: `{"status":"OK","version":"1.0","revision":"EJBCA 9.3.7 Community (afce321eed98ab06bd8cc78e89fc50b73a5b8db4)"}`
- TLS server certificate SAN: `DNS:ejbca`; local `127.0.0.1:8444` probe cần `-k` cho PoC.

Compose default đã pin `keyfactor/ejbca-ce:9.3.7`. Recreate EJBCA trước khi coi image tag là runtime chuẩn.
 [docs/v3-migration/ejbca-certificate-contract-probes.md#2F7E]

## 2. Lấy danh sách CA và profile

### CA list

```bash
$CURL_EJBCA "$EJBCA_URL/v1/ca" | jq .
```

### Certificate profiles

Dùng `subject_dn` thực tế của CA:

```bash
export CA_SUBJECT_DN='CN=ExampleCA'
$CURL_EJBCA "$EJBCA_URL/v1/ca/$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["CA_SUBJECT_DN"], safe=""))')/certificateprofile" | jq .
```

### End Entity profiles

Không probe profile End Entity riêng: endpoint này nằm ngoài ba nhóm API được chấp nhận. Dùng tên profile đã cấu hình trước, rồi xác nhận qua response/lỗi của `pkcs10enroll`.

## 3. Kiểm tra search contract

### Search theo serial

```bash
$CURL_EJBCA -X POST "$EJBCA_URL/v1/certificate/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "max_number_of_results": 10,
    "criteria": [
      {"property":"SERIAL_NUMBER","operation":"EQUAL","value":"00"}
    ]
  }' | jq .
```

### Search theo CA/status

```bash
$CURL_EJBCA -X POST "$EJBCA_URL/v1/certificate/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "max_number_of_results": 10,
    "criteria": [
      {"property":"CA","operation":"EQUAL","value":"ExampleCA"},
      {"property":"STATUS","operation":"EQUAL","value":"CERT_ACTIVE"}
    ]
  }' | jq .
```

### V2 count/search hiện gateway đang dùng

```bash
$CURL_EJBCA "$EJBCA_URL/v2/certificate/count" | jq .

$CURL_EJBCA -X POST "$EJBCA_URL/v2/certificate/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "pagination":{"current_page":1,"page_size":10},
    "criteria":[],
    "sort_by":"subject",
    "sort_order":"asc"
  }' | jq .
```

## 4. Probe issue bằng CSR

Chuẩn bị CSR PEM/Base64. `username/password` phải là End Entity đã tồn tại trên EJBCA.

```bash
export CSR_FILE='/absolute/path/request.csr'
export EJBCA_USERNAME='replace-me'
export EJBCA_PASSWORD='replace-me'
export CERT_PROFILE='ENDUSER'
export EE_PROFILE='ExampleEEP'
export CA_NAME='ExampleCA'

CSR_B64=$(base64 -w0 "$CSR_FILE")

$CURL_EJBCA -X POST "$EJBCA_URL/v1/certificate/pkcs10enroll" \
  -H 'Content-Type: application/json' \
  -d "{
    \"certificate_request\":\"$CSR_B64\",
    \"certificate_profile_name\":\"$CERT_PROFILE\",
    \"end_entity_profile_name\":\"$EE_PROFILE\",
    \"certificate_authority_name\":\"$CA_NAME\",
    \"username\":\"$EJBCA_USERNAME\",
    \"password\":\"$EJBCA_PASSWORD\",
    \"include_chain\":true,
    \"response_format\":\"DER\"
  }" | jq .
```

Ghi lại:

- HTTP status
- response headers/content type
- response JSON keys
- `certificate` encoding
- `serial_number` format
- `certificate_chain` encoding
- lỗi khi thiếu từng field

Không gửi output chứa password.

## 5. Probe revoke

Thay `ISSUER_DN` và `SERIAL` bằng certificate vừa issue.

```bash
export ISSUER_DN='CN=ExampleCA'
export SERIAL='00ABCDEF'

$CURL_EJBCA -X PUT \
  "$EJBCA_URL/v1/certificate/$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["ISSUER_DN"], safe=""))')/$SERIAL/revoke?reason=CERTIFICATE_HOLD" \
  | jq .
```

Probe gỡ hold:

```bash
$CURL_EJBCA -X PUT \
  "$EJBCA_URL/v1/certificate/$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["ISSUER_DN"], safe=""))')/$SERIAL/revoke?reason=REMOVE_FROM_CRL" \
  | jq .
```

Ghi lại response trước/sau revoke, đặc biệt `revoked`, reason, dates, message.

## 6. Probe export/read certificate bytes

`/v1/ca/{subject_dn}/certificate/download` chỉ kiểm tra CA chain, không dùng làm leaf export.

```bash
$CURL_EJBCA -D /tmp/ejbca-ca-chain.headers \
  "$EJBCA_URL/v1/ca/$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["CA_SUBJECT_DN"], safe=""))')/certificate/download" \
  -o /tmp/ejbca-ca-chain.out

cat /tmp/ejbca-ca-chain.headers
file /tmp/ejbca-ca-chain.out
```

Đối chiếu certificate leaf từ output issue/search. Không chốt endpoint export gateway chỉ từ probe CA chain.

## 7. Gửi kết quả cần thiết

Gửi lại các output đã che secret:

1. `docker inspect` image + digest.
2. `/v1/certificate/status`.
3. `/v1/ca/status`.
4. CA/profile list.
5. Issue success + issue validation errors.
6. Revoke success.
7. Remove-from-CRL success hoặc error.
8. Headers/content type của CA chain download.

Sau đó mới chốt DTO tối thiểu và mở các route PoC phù hợp.
