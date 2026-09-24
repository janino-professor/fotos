async function enviarFotos() {
    const input = document.getElementById('fileInput');
    const statusDiv = document.getElementById('status');
    const files = input.files;

    if (files.length === 0) {
        statusDiv.innerText = 'Por favor, selecione ao menos uma foto.';
        return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.innerText = 'Fotos enviadas com sucesso!';
            // Recarrega a página para atualizar o mural com as novas fotos
            setTimeout(() => window.location.reload(), 1500);
        } else {
            statusDiv.innerText = `Erro: ${data.error || 'Falha ao enviar fotos.'}`;
        }
    } catch (err) {
        statusDiv.innerText = `Erro de conexão: ${err.message}`;
    }
}