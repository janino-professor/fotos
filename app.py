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

@app.route('/')
def index():
    fotos = []

    # 1. Tenta buscar as fotos cadastradas no GitHub
    if GITHUB_REPO and GITHUB_TOKEN:
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{TARGET_FOLDER}"
        try:
            res = requests.get(url, headers=headers)
            if res.status_code == 200:
                arquivos = res.json()
                # Salva os objetos das fotos do GitHub contendo o nome e o link de download direto
                fotos = [
                    {'tipo': 'github', 'url': file['download_url']} 
                    for file in arquivos if file['name'].lower().endswith(tuple(ALLOWED_EXTENSIONS))
                ]
        except Exception as e:
            print(f"Erro no GitHub: {e}")

    # 2. Se não houver fotos no GitHub ainda, busca as fotos decorativas locais de static/img
    if not fotos:
        img_dir = os.path.join(app.static_folder, 'img')
        if os.path.exists(img_dir):
            for f in os.listdir(img_dir):
                if allowed_file(f):
                    fotos.append({'tipo': 'local', 'filename': f})

    # Embaralha e seleciona até 5 fotos
    qtd = min(5, len(fotos))
    fotos_sorteadas = random.sample(fotos, qtd) if fotos else []

    return render_template('index.html', fotos=fotos_sorteadas)

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files.get('file') or request.files.get('files')
    
    if not file or file.filename == '':
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Extensão de arquivo não permitida'}), 400

    if not GITHUB_TOKEN or not GITHUB_REPO:
        return jsonify({'error': 'Configurações do GitHub não encontradas'}), 500

    try:
        content = file.read()
        content_b64 = base64.b64encode(content).decode('utf-8')
        
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