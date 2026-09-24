// Funções para controle do Modal de Zoom e Download
function abrirModal(urlFoto, legenda) {
    // Esconde a galeria em grid caso ela esteja aberta
    const galleryModal = document.getElementById('galleryModal');
    if (galleryModal) {
        galleryModal.style.display = 'none';
    }

    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalImg');
    const modalCaption = document.getElementById('modalCaption');
    const downloadBtn = document.getElementById('downloadBtn');

    modalImg.src = urlFoto;
    modalCaption.innerText = legenda || 'Foto de Família';
    downloadBtn.href = urlFoto;

    modal.style.display = 'flex';
}

function fecharModal(event) {
    if (event.target.id === 'photoModal') {
        document.getElementById('photoModal').style.display = 'none';
    }
}

function fecharModalDirect() {
    document.getElementById('photoModal').style.display = 'none';
}

// Funções para a Galeria em Grid (Todas as Fotos)
async function abrirGaleria() {
    const galleryModal = document.getElementById('galleryModal');
    const galleryGrid = document.getElementById('galleryGrid');

    galleryModal.style.display = 'flex';
    galleryGrid.innerHTML = '<p class="loading-txt">Carregando fotos do repositório...</p>';

    try {
        const response = await fetch('/todas-as-fotos');
        const data = await response.json();

        if (data.fotos && data.fotos.length > 0) {
            let html = '';
            data.fotos.forEach(foto => {
                const url = foto.tipo === 'github' ? foto.url : foto.url;
                html += `
                    <div class="grid-item" onclick="abrirModal('${url}', '${foto.nome}')">
                        <img src="${url}" alt="${foto.nome}" loading="lazy">
                        <div class="grid-overlay">
                            <i class="fa-solid fa-magnifying-glass-plus"></i>
                        </div>
                    </div>
                `;
            });
            galleryGrid.innerHTML = html;
        } else {
            galleryGrid.innerHTML = '<p class="loading-txt">Nenhuma foto encontrada no repositório.</p>';
        }
    } catch (err) {
        galleryGrid.innerHTML = `<p class="loading-txt">Erro ao carregar galeria: ${err.message}</p>`;
    }
}

function fecharGaleria(event) {
    if (event.target.id === 'galleryModal') {
        document.getElementById('galleryModal').style.display = 'none';
    }
}

function fecharGaleriaDirect() {
    document.getElementById('galleryModal').style.display = 'none';
}

// Função de Upload para a API Flask / GitHub
async function enviarFotos() {
    const input = document.getElementById('fileInput');
    const statusDiv = document.getElementById('status');
    const files = input.files;

    if (files.length === 0) {
        statusDiv.className = 'status-msg status-error';
        statusDiv.innerText = 'Por favor, selecione ao menos uma foto.';
        return;
    }

    statusDiv.className = 'status-msg';
    statusDiv.innerText = 'Enviando foto(s)... Aguarde.';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                statusDiv.className = 'status-msg status-success';
                statusDiv.innerText = `Foto ${file.name} enviada com sucesso!`;
            } else {
                statusDiv.className = 'status-msg status-error';
                statusDiv.innerText = `Erro em ${file.name}: ${data.error}`;
                return;
            }
        } catch (err) {
            statusDiv.className = 'status-msg status-error';
            statusDiv.innerText = `Erro de conexão: ${err.message}`;
            return;
        }
    }

    setTimeout(() => {
        window.location.reload();
    }, 1200);
}