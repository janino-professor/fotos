import os
import random
import base64
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
GITHUB_REPO = os.getenv('GITHUB_REPO')
TARGET_FOLDER = 'fotos_familia'

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def fetch_github_contents(path=""):
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    items = []
    
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            contents = res.json()
            for item in contents:
                if item['type'] == 'dir':
                    items.extend(fetch_github_contents(item['path']))
                elif item['type'] == 'file' and allowed_file(item['name']):
                    rel_path = item['path'].replace(f"{TARGET_FOLDER}/", "")
                    folder_name = rel_path.split('/')[0] if '/' in rel_path else "Geral"
                    
                    items.append({
                        'tipo': 'github',
                        'url': item['download_url'],
                        'nome': item['name'],
                        'pasta': folder_name
                    })
    except Exception as e:
        print(f"Erro ao buscar no repositório GitHub ({path}): {e}")

    return items

@app.route('/')
def index():
    fotos = []

    if GITHUB_REPO and GITHUB_TOKEN:
        try:
            fotos = fetch_github_contents(TARGET_FOLDER)
        except Exception as e:
            print(f"Erro no GitHub: {e}")

    if not fotos:
        img_dir = os.path.join(app.static_folder, 'img')
        if os.path.exists(img_dir):
            for f in os.listdir(img_dir):
                if allowed_file(f):
                    fotos.append({'tipo': 'local', 'filename': f, 'nome': f, 'pasta': 'Geral'})

    qtd = min(5, len(fotos))
    fotos_sorteadas = random.sample(fotos, qtd) if fotos else []

    return render_template('index.html', fotos=fotos_sorteadas)

@app.route('/todas-as-fotos')
def todas_as_fotos():
    fotos = []

    if GITHUB_REPO and GITHUB_TOKEN:
        try:
            fotos = fetch_github_contents(TARGET_FOLDER)
        except Exception as e:
            print(f"Erro no GitHub: {e}")

    if not fotos:
        img_dir = os.path.join(app.static_folder, 'img')
        if os.path.exists(img_dir):
            for f in os.listdir(img_dir):
                if allowed_file(f):
                    fotos.append({
                        'tipo': 'local', 
                        'url': f"/static/img/{f}", 
                        'nome': f,
                        'pasta': 'Geral'
                    })

    return jsonify({'fotos': fotos})

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files.get('file') or request.files.get('files')
    pasta = request.form.get('pasta', '').strip()
    
    if not file or file.filename == '':
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Extensão de arquivo não permitida'}), 400

    if not GITHUB_TOKEN or not GITHUB_REPO:
        return jsonify({'error': 'Configurações do GitHub não encontradas'}), 500

    try:
        content = file.read()
        content_b64 = base64.b64encode(content).decode('utf-8')
        
        if pasta:
            pasta_limpa = "".join(c for c in pasta if c.isalnum() or c in (' ', '_', '-')).strip()
            path_in_repo = f"{TARGET_FOLDER}/{pasta_limpa}/{file.filename}"
        else:
            path_in_repo = f"{TARGET_FOLDER}/{file.filename}"

        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path_in_repo}"

        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }

        payload = {
            "message": f"Nova foto adicionada: {file.filename}",
            "content": content_b64,
            "branch": "main"
        }

        res = requests.put(url, json=payload, headers=headers)

        if res.status_code in [200, 201]:
            return jsonify({'success': True, 'message': 'Foto enviada com sucesso!'}), 200
        else:
            erro_github = res.json().get('message', 'Erro desconhecido no GitHub')
            return jsonify({'error': f'Erro no GitHub: {erro_github}'}), res.status_code

    except Exception as e:
        return jsonify({'error': f'Falha interna: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)