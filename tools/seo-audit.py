# Auditoria tecnica e on-page do wevolv3.com AO VIVO, do jeito que o Googlebot le.
# So leitura: percorre o sitemap publicado, baixa cada URL e mede os itens do
# checklist de SEO que da para medir por maquina. Compara com a rodada anterior
# e aponta o que e NOVO, que e o que interessa na rotina.
#
#   python tools/seo-audit.py            -> grava docs/seo-audit/latest.json e imprime o resumo
#
# Detalhes que ja geraram falso positivo e estao tratados aqui:
# - <script> e <noscript> saem antes de contar h1/img/link (o JS do blog tem
#   `<h1>${text}</h1>` em string, e o <noscript> repete o titulo do post).
# - o site responde a mesma pagina em /about e /about.html; a comparacao de URL
#   ignora .html e barra final, e o problema real (link interno apontando para a
#   URL que NAO e a canonica) tem uma checagem propria.
# - o certifi local desatualizado recusa a cadeia nova do Let's Encrypt; o site
#   esta ok, entao a leitura roda sem verificar certificado.
import json
import os
import re
import ssl
import sys
import urllib.request
from collections import Counter
from datetime import date
from html import unescape
from urllib.parse import urljoin, urlparse

SITE = "https://wevolv3.com"
UA = {"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}
CTX = ssl._create_unverified_context()
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "docs", "seo-audit", "latest.json")


def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            return r.status, r.geturl(), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, ""
    except Exception as e:
        return 0, url, str(e)


def norm(u):
    u = u.split("#")[0].split("?")[0].replace("://www.", "://").rstrip("/")
    return u[:-5] if u.endswith(".html") else u


def meta(head, name):
    m = re.search(r'<meta\b[^>]*\bname=["\']%s["\'][^>]*>' % name, head, re.I)
    if not m:
        return ""
    c = re.search(r'\bcontent=(["\'])(.*?)\1', m.group(0), re.S | re.I)
    return unescape(c.group(2).strip()) if c else ""


def auditar():
    _, _, sm = get(SITE + "/sitemap.xml")
    urls = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", sm)
    pages = {}
    for u in urls:
        st, final, doc = get(u)
        head = doc.split("</head>")[0] if "</head>" in doc else doc[:20000]
        body = doc.split("<body", 1)[-1]
        body = re.sub(r"<(script|noscript|style)\b[^>]*>.*?</\1>", " ", body, flags=re.S | re.I)
        title = re.search(r"<title[^>]*>(.*?)</title>", head, re.S | re.I)
        canon = re.search(r'<link\b[^>]*rel=["\']canonical["\'][^>]*>', head, re.I)
        canon = re.search(r'href=["\']([^"\']+)', canon.group(0)).group(1) if canon else ""
        imgs = re.findall(r"<img\b[^>]*>", body, re.I)
        ld = re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', doc, re.S | re.I)
        links = set()
        for h in re.findall(r'<a\b[^>]*\bhref=["\']([^"\'#]+)', body, re.I):
            a = urljoin(final, h)
            if urlparse(a).netloc.replace("www.", "") == "wevolv3.com":
                links.add(a.split("?")[0])
        pages[u] = {
            "status": st,
            "title": unescape(title.group(1).strip()) if title else "",
            "desc": meta(head, "description"),
            "canonical": canon,
            "robots": meta(head, "robots"),
            "h1": len(re.findall(r"<h1\b", body, re.I)),
            "imgs": len(imgs),
            "sem_alt": sum(1 for i in imgs if not re.search(r'\balt=["\'][^"\']+["\']', i, re.I)),
            "schema": sorted(set(re.findall(r'"@type"\s*:\s*"([^"]+)"', " ".join(ld)))),
            "links": sorted(links),
            "palavras": len(re.sub(r"<[^>]+>", " ", body).split()),
        }

    canonica = {norm(u): (p["canonical"] or u) for u, p in pages.items()}
    status = {norm(u): p["status"] for u, p in pages.items()}
    entrada, quebrados, fora_canon = Counter(), {}, {}
    for u, p in pages.items():
        for l in p["links"]:
            n = norm(l)
            if n != norm(u):
                entrada[n] += 1
            if re.search(r"\.(png|jpe?g|webp|avif|svg|gif|pdf|css|js|ico|xml|txt|json)$", l, re.I):
                continue
            if n not in status:
                status[n] = get(l)[0]
            if status[n] != 200:
                quebrados.setdefault(l, []).append(u)
            elif n in canonica and l.rstrip("/") != canonica[n].rstrip("/"):
                fora_canon.setdefault(l, canonica[n])

    tit = Counter(p["title"] for p in pages.values())
    des = Counter(p["desc"] for p in pages.values() if p["desc"])
    r = {
        "status_nao_200": {u: p["status"] for u, p in pages.items() if p["status"] != 200},
        "noindex_no_sitemap": [u for u, p in pages.items() if "noindex" in p["robots"].lower()],
        "canonical_ausente": [u for u, p in pages.items() if not p["canonical"]],
        "canonical_aponta_outra_url": {u: p["canonical"] for u, p in pages.items() if p["canonical"] and norm(p["canonical"]) != norm(u)},
        "title_curto_ou_longo": {u: len(p["title"]) for u, p in pages.items() if not 30 <= len(p["title"]) <= 60},
        "title_duplicado": [t for t, n in tit.items() if n > 1],
        "description_ausente": [u for u, p in pages.items() if not p["desc"]],
        "description_longa_ou_curta": {u: len(p["desc"]) for u, p in pages.items() if p["desc"] and not 70 <= len(p["desc"]) <= 160},
        "description_duplicada": [d[:80] for d, n in des.items() if n > 1],
        "h1_ausente_ou_multiplo": {u: p["h1"] for u, p in pages.items() if p["h1"] != 1},
        "imagem_sem_alt": {u: f'{p["sem_alt"]}/{p["imgs"]}' for u, p in pages.items() if p["sem_alt"]},
        "sem_schema": [u for u, p in pages.items() if not p["schema"]],
        "sem_breadcrumb": [u for u, p in pages.items() if "BreadcrumbList" not in p["schema"]],
        "links_internos_quebrados": quebrados,
        "links_internos_fora_da_canonica": fora_canon,
        "orfas_sem_link_interno": [u for u in pages if entrada[norm(u)] == 0 and norm(u) != norm(SITE)],
        "paginas_finas_menos_300_palavras": {u: p["palavras"] for u, p in pages.items() if p["palavras"] < 300},
    }
    return {"data": date.today().isoformat(), "total_paginas": len(pages), "achados": r}


def chaves(v):
    return set(v.keys()) if isinstance(v, dict) else set(v)


if __name__ == "__main__":
    anterior = json.load(open(SAIDA, encoding="utf-8")) if os.path.exists(SAIDA) else None
    atual = auditar()
    print(f"{atual['total_paginas']} paginas no sitemap, lidas como Googlebot em {atual['data']}")
    for k, v in atual["achados"].items():
        novos = chaves(v) - chaves(anterior["achados"].get(k, [])) if anterior else set()
        resolvidos = chaves(anterior["achados"].get(k, [])) - chaves(v) if anterior else set()
        linha = f"- {k}: {len(v)}"
        if novos:
            linha += f" | NOVOS: {sorted(novos)[:5]}"
        if resolvidos:
            linha += f" | resolvidos: {len(resolvidos)}"
        print(linha)
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    json.dump(atual, open(SAIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("gravado em", SAIDA)
