import os
import random
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    # Caminho completo para a pasta de imagens estáticas
    img_dir = os.path.join(app.static_folder, 'img')
    
    # Busca todas as imagens disponíveis na pasta
    todas_fotos = []
    if os.path.exists(img_dir):
        todas_fotos = [
            f for f in os.listdir(img_dir) 
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
        ]
    
    # Sorteia até 5 fotos da lista sem repetição
    qtd = min(5, len(todas_fotos))
    fotos_sorteadas = random.sample(todas_fotos, qtd) if todas_fotos else []

    return render_template('index.html', fotos=fotos_sorteadas)

if __name__ == '__main__':
    app.run(debug=True)