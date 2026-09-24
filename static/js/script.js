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