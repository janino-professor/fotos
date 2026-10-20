import os
import random
import base64
import requests
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'chave_secreta_familia_123')

GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
GITHUB_REPO = os.getenv('GITHUB_REPO')
TARGET_FOLDER = 'fotos_familia'

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

# Definição de usuários e suas pastas base/iniciais permitidas
USUARIOS = {
    'nino': {
        'senha': '20052545',
        'pastas': '*' 
    },
    'hellem': {
        'senha': '1827979',
        'pastas': ['Hellem Aguiar']
    },
    'tamires': {
        'senha': '02051987',
        'pastas': ['Familia']
    },
    'afonso': {
        'senha': '123456',
        'pastas': ['Familia']
    },
    'girlandia': {
        'senha': '123456',
        'pastas': ['Familia']
    }
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def obter_base_pasta_usuario(usuario):
    """Retorna a pasta base padrão vinculada ao usuário (se houver)."""
    if usuario not in USUARIOS:
        return None
    pastas = USUARIOS[usuario]['pastas']
    if pastas == '*':
        return None
    if isinstance(pastas, list) and len(pastas) > 0:
        return pastas[0]
    return None

def usuario_tem_permissao(usuario, nome_pasta):
    if not usuario or usuario not in USUARIOS:
        return False
    
    pastas_permitidas = USUARIOS[usuario]['pastas']
    if pastas_permitidas == '*':
        return True
    
    if not nome_pasta or nome_pasta.lower() == 'geral':
        return False
    
    nome_pasta_limpo = nome_pasta.strip().lower()

    # 1. Verifica se a pasta coincide exatamente com alguma pasta permitida do usuário
    for p in pastas_permitidas:
        if p.strip().lower() == nome_pasta_limpo:
            return True
        # Se for uma subpasta da pasta do usuário (ex: "Hellem Aguiar/Aniversario")
        if nome_pasta_limpo.startswith(p.strip().lower() + "/"):
            return True

    return False

def resolver_caminho_pasta(usuario, pasta_digitada):
    """
    Define a estrutura no repositório GitHub.
    Se o usuário tem uma pasta base (ex: 'Hellem Aguiar') e cria uma nova pasta 'Viagem',
    o caminho será 'Hellem Aguiar/Viagem'.
    Para usuários com '*', a pasta é criada na raiz do repositório.
    """
    pasta_digitada = pasta_digitada.strip().strip('/')
    if not pasta_digitada:
        return ""

    pasta_base = obter_base_pasta_usuario(usuario)

    if pasta_base:
        # Se digitou exatamente a pasta base, usa ela
        if pasta_digitada.lower() == pasta_base.lower():
            return pasta_base
        # Se já começou com a pasta base, usa como está
        if pasta_digitada.lower().startswith(pasta_base.lower() + "/"):
            return pasta_digitada
        # Caso contrário, transforma em uma subpasta dentro da pasta base do usuário
        return f"{pasta_base}/{pasta_digitada}"
    
    return pasta_digitada

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
                    
                    if '/' in rel_path:
                        folder_name = rel_path.rsplit('/', 1)[0]
                    else:
                        folder_name = "Geral"
                    
                    items.append({
                        'tipo': 'github',
                        'url': item['download_url'],
                        'nome': item['name'],
                        'pasta': folder_name
                    })
    except Exception as e:
        print(f"Erro ao buscar no repositório GitHub ({path}): {e}")

    return items

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username', '').strip().lower()
        password = data.get('password', '').strip()

        if username in USUARIOS and USUARIOS[username]['senha'] == password:
            session['usuario'] = username
            if request.is_json:
                return jsonify({'success': True, 'redirect': url_for('index')})
            return redirect(url_for('index'))
        
        if request.is_json:
            return jsonify({'error': 'Usuário ou senha incorretos'}), 401
        return render_template('login.html', erro='Usuário ou senha incorretos')

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('usuario', None)
    return redirect(url_for('login'))

@app.route('/')
def index():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    usuario_atual = session['usuario']
    fotos_usuario = []
    pastas_existentes = []

    if GITHUB_REPO and GITHUB_TOKEN:
        try:
            todas_fotos = fetch_github_contents(TARGET_FOLDER)
            
            # Filtra estritamente apenas as fotos permitidas para o usuário logado
            if USUARIOS[usuario_atual]['pastas'] == '*':
                fotos_usuario = todas_fotos
            else:
                fotos_usuario = [f for f in todas_fotos if usuario_tem_permissao(usuario_atual, f.get('pasta'))]

            todas_pastas = sorted(list(set(f['pasta'] for f in todas_fotos if f.get('pasta') and f['pasta'] != 'Geral')))
            
            if USUARIOS[usuario_atual]['pastas'] == '*':
                pastas_existentes = todas_pastas
            else:
                pastas_existentes = [p for p in todas_pastas if usuario_tem_permissao(usuario_atual, p)]
                
                # Garante que a pasta base do usuário sempre apareça nas opções
                pasta_base = obter_base_pasta_usuario(usuario_atual)
                if pasta_base and pasta_base not in pastas_existentes:
                    pastas_existentes.insert(0, pasta_base)

        except Exception as e:
            print(f"Erro no GitHub: {e}")

    if not fotos_usuario and USUARIOS[usuario_atual]['pastas'] == '*':
        img_dir = os.path.join(app.static_folder, 'img')
        if os.path.exists(img_dir):
            for f in os.listdir(img_dir):
                if allowed_file(f):
                    fotos_usuario.append({'tipo': 'local', 'filename': f, 'nome': f, 'pasta': 'Geral'})

    qtd = min(5, len(fotos_usuario))
    fotos_sorteadas = random.sample(fotos_usuario, qtd) if fotos_usuario else []
    usuario_exibicao = usuario_atual.capitalize()

    return render_template(
        'index.html', 
        fotos=fotos_sorteadas, 
        pastas_existentes=pastas_existentes,
        usuario=usuario_exibicao
    )

@app.route('/todas-as-fotos')
def todas_as_fotos():
    if 'usuario' not in session:
        return jsonify({'error': 'Não autorizado'}), 401

    usuario_atual = session['usuario']
    fotos_usuario = []

    if GITHUB_REPO and GITHUB_TOKEN:
        try:
            todas_fotos = fetch_github_contents(TARGET_FOLDER)
            
            if USUARIOS[usuario_atual]['pastas'] == '*':
                fotos_usuario = todas_fotos
            else:
                fotos_usuario = [f for f in todas_fotos if usuario_tem_permissao(usuario_atual, f.get('pasta'))]
        except Exception as e:
            print(f"Erro no GitHub: {e}")

    return jsonify({'fotos': fotos_usuario})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'usuario' not in session:
        return jsonify({'error': 'Sessão expirada. Faça login novamente.'}), 401

    usuario_atual = session['usuario']
    file = request.files.get('file') or request.files.get('files')
    pasta_digitada = request.form.get('pasta', '').strip()
    
    if not file or file.filename == '':
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Extensão de arquivo não permitida'}), 400

    if not pasta_digitada:
        return jsonify({'error': 'Informe ou selecione uma pasta para o upload.'}), 400

    # Resolve o caminho final considerando a subpasta do usuário
    caminho_pasta_final = resolver_caminho_pasta(usuario_atual, pasta_digitada)

    if not usuario_tem_permissao(usuario_atual, caminho_pasta_final):
        return jsonify({'error': f'Você não tem permissão para enviar fotos na pasta "{caminho_pasta_final}".'}), 403

    if not GITHUB_TOKEN or not GITHUB_REPO:
        return jsonify({'error': 'Configurações do GitHub não encontradas'}), 500

    try:
        content = file.read()
        content_b64 = base64.b64encode(content).decode('utf-8')
        
        path_in_repo = f"{TARGET_FOLDER}/{caminho_pasta_final}/{file.filename}"

        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path_in_repo}"

        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }

        payload = {
            "message": f"Nova foto enviada por {usuario_atual}: {file.filename} em {caminho_pasta_final}",
            "content": content_b64,
            "branch": "main"
        }

        res = requests.put(url, json=payload, headers=headers)

        if res.status_code in [200, 201]:
            # Adiciona a nova subpasta dinamicamente à lista em memória do usuário se ainda não constar
            if USUARIOS[usuario_atual]['pastas'] != '*':
                if caminho_pasta_final not in USUARIOS[usuario_atual]['pastas']:
                    USUARIOS[usuario_atual]['pastas'].append(caminho_pasta_final)

            return jsonify({'success': True, 'message': 'Foto enviada com sucesso!'}), 200
        else:
            erro_github = res.json().get('message', 'Erro desconhecido no GitHub')
            return jsonify({'error': f'Erro no GitHub: {erro_github}'}), res.status_code

    except Exception as e:
        return jsonify({'error': f'Falha interna: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)