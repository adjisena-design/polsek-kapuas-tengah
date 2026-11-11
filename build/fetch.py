# Pull the console content from Supabase into build/content.json (run by the Publish action before build.py).
import json, os, sys, urllib.request
SB = 'https://zybfcsdhpoqalmkvmhtu.supabase.co'
KEY = 'sb_publishable_ENDYCMKsm0ISXG-4mR0Pow_KstchvPW'  # public key; these tables are public-read

def get(path):
    req = urllib.request.Request(f'{SB}/rest/v1/{path}', headers={'apikey': KEY, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

c = {
    'settings': {r['key']: r['value'] for r in get('site_settings?select=key,value')},
    'texts': get('site_text?select=key,page,sort,id,en,nij&order=sort&limit=5000'),
    'hero': get('hero_slides?select=*&order=sort'),
    'services': get('services?select=*&order=sort'),
    'villages': get('villages?select=*&order=sort'),
}
# a half-empty answer must never wipe the live site
need = ['wa', 'wa_display', 'address', 'maps', 'instagram', 'instagram_handle', 'facebook']
if not c['texts'] or not c['services'] or any(not c['settings'].get(k) for k in need):
    sys.exit('fetch: content incomplete, not publishing')
json.dump(c, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content.json'), 'w'), ensure_ascii=False, indent=1)
print('fetched', len(c['texts']), 'texts,', len(c['services']), 'services,', len(c['hero']), 'slides')
