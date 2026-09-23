const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const statusDiv = document.getElementById('status');
const uploadBtn = document.getElementById('uploadBtn');

// Exibe os nomes dos arquivos selecionados na tela
fileInput.addEventListener('change', () => {
    fileList.innerHTML = '';
    const files = fileInput.files;

    if (files.length > 0) {
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';

        for (let i = 0; i < files.length; i++) {
            const item = document.createElement('li');
            item.innerHTML = `<i class="fa-regular fa-image"></i> ${files[i].name}`;
            item.style.marginBottom = '4px';
            list.appendChild(item);
        }
        fileList.appendChild(list);
    }
});

async function enviarFotos() {
    const files = fileInput.files;

    if (!files.length) {
        statusDiv.className = "status-msg status-error";
        statusDiv.innerText = "Por favor, selecione ao menos uma foto.";
        return;
    }

    uploadBtn.disabled = true;
    statusDiv.className = "status-msg";
    statusDiv.innerText = "Enviando fotos, aguarde...";

    let enviadas = 0;

    for (let file of files) {
        const formData = new FormData();
        formData.append("foto", file);

        try {
            let response = await fetch("/upload", {
                method: "POST",
                body: formData
            });

            let result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Erro ao enviar imagem.");
            }

            enviadas++;
            statusDiv.innerText = `Enviando... (${enviadas}/${files.length})`;

        } catch (error) {
            statusDiv.className = "status-msg status-error";
            statusDiv.innerText = `Erro em ${file.name}: ${error.message}`;
            uploadBtn.disabled = false;
            return;
        }
    }

    statusDiv.className = "status-msg status-success";
    statusDiv.innerText = "✅ Todas as fotos foram salvas com sucesso!";
    
    // Limpa o formulário
    fileInput.value = "";
    fileList.innerHTML = "";
    uploadBtn.disabled = false;
}