let fotosSalvas = [];

function abrirModal(urlFoto, legenda) {
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

async function abrirGaleria() {
    const galleryModal = document.getElementById('galleryModal');
    const galleryGrid = document.getElementById('galleryGrid');
    const folderTabs = document.getElementById('folderTabs');

    galleryModal.style.display = 'flex';
    galleryGrid.innerHTML = '<p class="loading-txt">Carregando fotos do repositório...</p>';
    folderTabs.innerHTML = '';

    try {
        const response = await fetch('/todas-as-fotos');
        const data = await response.json();

        if (data.fotos && data.fotos.length > 0) {
            fotosSalvas = data.fotos;
            
            const pastas = [...new Set(fotosSalvas.map(f => f.pasta || 'Geral'))];
            
            let tabsHtml = `<button type="button" class="tab-btn active" onclick="filtrarPasta('TODAS', this)">Todas</button>`;
            pastas.forEach(pasta => {
                tabsHtml += `<button type="button" class="tab-btn" onclick="filtrarPasta('${pasta}', this)"><i class="fa-solid fa-folder"></i> ${pasta}</button>`;
            });
            folderTabs.innerHTML = tabsHtml;

            renderizarGrid(fotosSalvas);
        } else {
            galleryGrid.innerHTML = '<p class="loading-txt">Nenhuma foto encontrada no repositório.</p>';
        }
    } catch (err) {
        galleryGrid.innerHTML = `<p class="loading-txt">Erro ao carregar galeria: ${err.message}</p>`;
    }
}

function renderizarGrid(listaFotos) {
    const galleryGrid = document.getElementById('galleryGrid');
    if (listaFotos.length === 0) {
        galleryGrid.innerHTML = '<p class="loading-txt">Nenhuma foto nesta pasta.</p>';
        return;
    }

    let html = '';
    listaFotos.forEach(foto => {
        html += `
            <div class="grid-item" onclick="abrirModal('${foto.url}', '${foto.nome}')">
                <img src="${foto.url}" alt="${foto.nome}" loading="lazy">
                <div class="grid-overlay">
                    <i class="fa-solid fa-magnifying-glass-plus"></i>
                </div>
            </div>
        `;
    });
    galleryGrid.innerHTML = html;
}

function filtrarPasta(nomePasta, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (nomePasta === 'TODAS') {
        renderizarGrid(fotosSalvas);
    } else {
        const filtradas = fotosSalvas.filter(f => (f.pasta || 'Geral') === nomePasta);
        renderizarGrid(filtradas);
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

async function enviarFotos() {
    const input = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const statusDiv = document.getElementById('status');
    const files = input.files;
    const nomePasta = folderInput.value.trim();

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
        formData.append('pasta', nomePasta);

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