let todasAsFotos = [];
let pastaAtual = 'todas';

function ehVideo(url, tipoMidia) {
    if (tipoMidia === 'video') return true;
    if (!url) return false;
    const extensoesVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp'];
    const urlLower = url.toLowerCase();
    return extensoesVideo.some(ext => urlLower.endsWith(ext));
}

function abrirModal(url, legenda, tipoMidia) {
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalImg');
    const modalVideo = document.getElementById('modalVideo');
    const modalCaption = document.getElementById('modalCaption');
    const downloadBtn = document.getElementById('downloadBtn');

    if (modal && modalCaption && downloadBtn) {
        const eVideo = ehVideo(url, tipoMidia);

        if (eVideo) {
            if (modalImg) modalImg.style.display = 'none';
            if (modalVideo) {
                modalVideo.src = url;
                modalVideo.style.display = 'block';
            }
        } else {
            if (modalVideo) {
                modalVideo.pause();
                modalVideo.style.display = 'none';
                modalVideo.src = '';
            }
            if (modalImg) {
                modalImg.src = url;
                modalImg.style.display = 'block';
            }
        }

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
    const modalVideo = document.getElementById('modalVideo');
    if (modalVideo) {
        modalVideo.pause();
        modalVideo.src = '';
    }
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
        galleryGrid.innerHTML = '<p class="loading-txt">Carregando mídias do repositório...</p>';
    }

    fetch('/todas-as-fotos')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao carregar as mídias');
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
                galleryGrid.innerHTML = '<p class="error-txt">Erro ao carregar mídias. Tente novamente.</p>';
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
        galleryGrid.innerHTML = '<p class="empty-txt">Nenhuma mídia encontrada nesta pasta.</p>';
        return;
    }

    let html = '';
    fotosFiltradas.forEach(foto => {
        const imgUrl = foto.url || `/static/img/${foto.filename}`;
        const nomeFoto = foto.nome || 'Lembrança da Família';
        const eVideo = ehVideo(imgUrl, foto.midia);

        if (eVideo) {
            html += `
                <div class="gallery-item" onclick="abrirModal('${imgUrl}', '${nomeFoto}', 'video')">
                    <video src="${imgUrl}" style="width:100%; height:100%; object-fit:cover;"></video>
                    <i class="fa-solid fa-circle-play" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; color: white; text-shadow: 0 2px 6px rgba(0,0,0,0.6);"></i>
                </div>
            `;
        } else {
            html += `
                <div class="gallery-item" onclick="abrirModal('${imgUrl}', '${nomeFoto}', 'foto')">
                    <img src="${imgUrl}" alt="${nomeFoto}" loading="lazy">
                </div>
            `;
        }
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
        if (statusDiv) statusDiv.innerHTML = '<span class="erro">Por favor, selecione pelo menos um arquivo.</span>';
        return;
    }

    if (!pastaFinal) {
        if (statusDiv) statusDiv.innerHTML = '<span class="erro">Por favor, informe ou selecione uma pasta.</span>';
        return;
    }

    if (statusDiv) statusDiv.innerHTML = '<span class="info">Enviando arquivos... Aguarde.</span>';
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
                    if (statusDiv) statusDiv.innerHTML = '<span class="sucesso">Todos os arquivos foram enviados com sucesso!</span>';
                    setTimeout(() => { window.location.reload(); }, 1500);
                } else {
                    if (statusDiv) statusDiv.innerHTML = `<span class="erro">${enviosConcluidos} arquivo(s) enviado(s), mas ${erros} falhou(aram).</span>`;
                }
            }
        });
    }
}

/* Funções do Modal de Alterar Senha */
function abrirModalSenha() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        document.getElementById('passwordForm').reset();
        document.getElementById('passwordStatus').innerHTML = '';
        modal.style.display = 'flex';
    }
}

function fecharModalSenha(event) {
    if (event.target.id === 'passwordModal') {
        fecharModalSenhaDirect();
    }
}

function fecharModalSenhaDirect() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function enviarAlteracaoSenha() {
    const senhaAtual = document.getElementById('senhaAtual').value.trim();
    const novaSenha = document.getElementById('novaSenha').value.trim();
    const confirmarSenha = document.getElementById('confirmarSenha').value.trim();
    const statusDiv = document.getElementById('passwordStatus');

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        statusDiv.innerHTML = '<span class="status-error">Preencha todos os campos.</span>';
        return;
    }

    if (novaSenha !== confirmarSenha) {
        statusDiv.innerHTML = '<span class="status-error">As novas senhas não coincidem.</span>';
        return;
    }

    statusDiv.innerHTML = '<span class="status-info">Salvando nova senha...</span>';

    fetch('/alterar-senha', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            senha_atual: senhaAtual,
            nova_senha: novaSenha,
            confirmar_senha: confirmarSenha
        })
    })
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(res => {
        if (res.status === 200 && res.body.success) {
            statusDiv.innerHTML = '<span class="status-success">Senha alterada com sucesso!</span>';
            setTimeout(() => {
                fecharModalSenhaDirect();
            }, 1500);
        } else {
            statusDiv.innerHTML = `<span class="status-error">${res.body.error || 'Erro ao alterar senha.'}</span>`;
        }
    })
    .catch(err => {
        console.error('Erro:', err);
        statusDiv.innerHTML = '<span class="status-error">Erro de conexão ao alterar senha.</span>';
    });
}