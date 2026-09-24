import os
import random
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configura a pasta onde as imagens enviadas serão salvas
UPLOAD_FOLDER = os.path.join(app.static_folder, 'img')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Extensões de arquivos permitidas
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    img_dir = app.config['UPLOAD_FOLDER']
    
    todas_fotos = []
    if os.path.exists(img_dir):
        todas_fotos = [
            f for f in os.listdir(img_dir) 
            if f.lower().endswith(tuple(ALLOWED_EXTENSIONS))
        ]
    
    qtd = min(5, len(todas_fotos))
    fotos_sorteadas = random.sample(todas_fotos, qtd) if todas_fotos else []

    return render_template('index.html', fotos=fotos_sorteadas)

# Rota para processar o envio das fotos
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files and 'files' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    # Garante a criação do diretório caso não exista
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    files = request.files.getlist('files') if 'files' in request.files else [request.files['file']]
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    return jsonify({'success': True, 'message': 'Fotos enviadas com sucesso!'}), 200

if __name__ == '__main__':
    app.run(debug=True)