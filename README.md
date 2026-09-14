# PlayTorrio → Nuvio (working bridge)

Đây là bản **Nuvio Local Scraper chạy được**, nhưng cần nói rõ:
nó KHÔNG phải bản port 45+ scraper Dart nguyên bản của PlayTorrio.

PlayTorrio V3 chạy các scraper bên trong app bằng Dart. Nuvio Local Scrapers lại chạy JavaScript cục bộ trên thiết bị. Vì vậy muốn có bản chính xác 1:1 phải port từng scraper.

Bản này dùng một endpoint Stremio-compatible để trả về torrent streams và biến kết quả thành định dạng Nuvio.

## Cài vào Nuvio

1. Giải nén ZIP.
2. Đưa thư mục này lên một GitHub repository công khai.
3. Trong Nuvio: Settings → Plugins → Add Provider.
4. Dùng URL:
   https://raw.githubusercontent.com/TEN_GITHUB_CUA_BAN/playtorrio-nuvio-plugin/main/manifest.json

Sau đó bật **PlayTorrio Torrent Bridge**.

## Ghi chú

Chỉ sử dụng nguồn và nội dung mà bạn có quyền truy cập.
