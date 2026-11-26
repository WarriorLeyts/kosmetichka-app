"""Package two real app exports as an isolated, fictional order preview."""
import json
import pathlib
import shutil

source = pathlib.Path(__file__).parent
dest = pathlib.Path('/tmp/order-service-site-preview')
if dest.exists():
    shutil.rmtree(dest)
dest.mkdir()
bootstrap = (source / 'bootstrap.js').read_text().replace('/* PRODUCTS */ []', json.dumps(json.loads((source / 'products.json').read_text()), ensure_ascii=False))
(dest / 'preview-bootstrap.js').write_text(bootstrap)
shutil.copy(source / 'index.html', dest / 'index.html')
for role, exported in [('customer', '/tmp/order-service-real-customer'), ('team', '/tmp/order-service-real-team')]:
    target = dest / role
    shutil.copytree(exported, target)
    html = (target / 'index.html').read_text()
    html = html.replace('<head>', '<head><meta name="robots" content="noindex,nofollow"><script src="/assets/order-service-preview-v1/preview-bootstrap.js"></script>', 1)
    (target / 'index.html').write_text(html)
    route = target / 'order' / '1248'
    route.mkdir(parents=True)
    (route / 'index.html').write_text(html)
    orders = target / 'orders'
    orders.mkdir(exist_ok=True)
    (orders / 'index.html').write_text(html)
print(dest)
