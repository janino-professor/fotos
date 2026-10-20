let todasAsFotos = [];
let pastaAtual = 'todas';

function abrirModal(url, legenda) {
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalImg');
    const modalCaption = document.getElementById('modalCaption');
    const downloadBtn = document.getElementById('downloadBtn');

    if (modal && modalImg && modalCaption && downloadBtn) {
        modalImg.src = url;
        modalCaption.innerText = legenda;
        downloadBtn.href = url;
        modal.style.display = 'flex';
    }
}

function fecharModal(event) {
    if (event.target.id === 'photoModal') {
        fecharModalDirect();
    }
}

function fecharModalDirect() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function abrirGaleria() {
    const modal = document.getElementById('galleryModal');
    if (modal) {
        modal.style.display = 'flex';
        carregarTodasAsFotos();
    }
}

function fecharGaleria(event) {
    if (event.target.id === 'galleryModal') {
        fecharGaleriaDirect();
    }
}

function fecharGaleriaDirect() {
    const modal = document.getElementById('galleryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function carregarTodasAsFotos() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (galleryGrid) {
        galleryGrid.innerHTML = '<p class="loading-txt">Carregando fotos do repositório...</p>';
    }

    fetch('/todas-as-fotos')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao carregar as fotos');
            }
            return response.json();
        })
        .then(data => {
            todasAsFotos = data.fotos || [];
            renderizarAbasEGrid();
        })
        .catch(error => {
            console.error('Erro:', error);
            if (galleryGrid) {
                galleryGrid.innerHTML = '<p class="error-txt">Erro ao carregar fotos. Tente novamente.</p>';
            }
        });
}

function renderizarAbasEGrid() {
    const folderTabs = document.getElementById('folderTabs');
    const galleryGrid = document.getElementById('galleryGrid');

    if (!folderTabs || !galleryGrid) return;

    const pastas = [...new Set(todasAsFotos.map(f => f.pasta))].filter(p => p && p !== 'Geral');
    pastas.sort();

    let tabsHtml = `<button class="tab-btn ${pastaAtual === 'todas' ? 'active' : ''}" onclick="filtrarPasta('todas')">Todas</button>`;

    pastas.forEach(pasta => {
        const nomeExibicao = pasta.split('/').pop();
        const activeClass = pastaAtual === pasta ? 'active' : '';

        tabsHtml += `
            <button class="tab-btn ${activeClass}" onclick="filtrarPasta('${pasta.replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-folder"></i> ${nomeExibicao}
            </button>
        `;
    });

    folderTabs.innerHTML = tabsHtml;
    exibirFotosGrid();
}

function filtrarPasta(pasta) {
    pastaAtual = pasta;
    renderizarAbasEGrid();
}

function exibirFotosGrid() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) return;

    let fotosFiltradas = todasAsFotos;
    if (pastaAtual !== 'todas') {
        fotosFiltradas = todasAsFotos.filter(f => f.pasta === pastaAtual);
    }

    if (fotosFiltradas.length === 0) {
        galleryGrid.innerHTML = '<p class="empty-txt">Nenhuma foto encontrada nesta pasta.</p>';
        return;
    }

    let html = '';
    fotosFiltradas.forEach(foto => {
        const imgUrl = foto.url || `/static/img/${foto.filename}`;
        const nomeFoto = foto.nome || 'Foto da Família';

        html += `
            <div class="gallery-item" onclick="abrirModal('${imgUrl}', '${nomeFoto}')">
                <img src="${imgUrl}" alt="${nomeFoto}" loading="lazy">
            </div>
        `;
    });

    galleryGrid.innerHTML = html;
}

function enviarFotos() {
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const existingFolderSelect = document.getElementById('existingFolderSelect');
    const statusDiv = document.getElementById('status');
    const uploadBtn = document.getElementById('uploadBtn');

    const files = fileInput ? fileInput.files : [];
    const novaPasta = folderInput ? folderInput.value.trim() : '';
    const pastaSelecionada = existingFolderSelect ? existingFolderSelect.value.trim() : '';

    const pastaFinal = novaPasta || pastaSelecionada;

    if (files.length === 0) {
        if (statusDiv) statusDiv.innerHTML = '<span class="erro">Por favor, selecione pelo menos uma foto.</span>';
        return;
    }

    if (!pastaFinal) {
        if (statusDiv) statusDiv.innerHTML = '<span class="erro">Por favor, informe ou selecione uma pasta.</span>';
        return;
    }

    if (statusDiv) statusDiv.innerHTML = '<span class="info">Enviando fotos... Aguarde.</span>';
    if (uploadBtn) uploadBtn.disabled = true;

    let enviosConcluidos = 0;
    let erros = 0;

    for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('pasta', pastaFinal);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                enviosConcluidos++;
            } else {
                erros++;
            }
        })
        .catch(() => {
            erros++;
        })
        .finally(() => {
            if (enviosConcluidos + erros === files.length) {
                if (uploadBtn) uploadBtn.disabled = false;
                if (erros === 0) {
                    if (statusDiv) statusDiv.innerHTML = '<span class="sucesso">Todas as fotos foram enviadas com sucesso!</span>';
                    setTimeout(() => { window.location.reload(); }, 1500);
                } else {
                    if (statusDiv) statusDiv.innerHTML = `<span class="erro">${enviosConcluidos} foto(s) enviada(s), mas ${erros} falhou(aram).</span>`;
                }
            }
        });
    }
} 