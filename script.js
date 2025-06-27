// Objeto de configuração que você pegou do site do Firebase
// Esta parte está correta no seu código!
const firebaseConfig = {
    apiKey: "AIzaSyBBGlcMt4-L6_MdLSFlaqYxyfuu4oQ_4bw",
    authDomain: "restaurante-coringa-app.firebaseapp.com",
    projectId: "restaurante-coringa-app",
    storageBucket: "restaurante-coringa-app.firebasestorage.app",
    messagingSenderId: "328833049744",
    appId: "1:328833049744:web:6bd4459aebd35bd41f2415"
};

// **CORREÇÃO AQUI**: Inicializa o Firebase usando a sintaxe global da v8
// Note que não há "import" no início do arquivo
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


document.addEventListener("DOMContentLoaded", () => {
    const dataElemento = document.getElementById('data-atual');
    const hoje = new Date();
    dataElemento.textContent = hoje.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    carregarCardapioDoBanco();
});

async function carregarCardapioDoBanco() {
    const container = document.getElementById('menu-container');
    container.innerHTML = 'Carregando cardápio...';

    try {
        const snapshot = await db.collection("cardapio").orderBy("ordem").get();

        if (snapshot.empty) {
            container.innerHTML = '<p>Nenhum item no cardápio de hoje.</p>';
            return;
        }

        const cardapioHtmlPromises = snapshot.docs.map(async (doc) => {
            const item = doc.data();
            let itemHtml = '';

            // Busca a subcoleção 'tamanhos' para este item
            const tamanhosSnapshot = await db.collection("cardapio").doc(doc.id).collection("tamanhos").get();

            if (tamanhosSnapshot.empty) {
                // Se NÃO tiver tamanhos, renderiza como um item simples (ex: acompanhamento)
                itemHtml = `
                    <div class="item-menu">
                        <div class="item-info">
                            <p class="nome">${item.nome}</p>
                            ${item.descricao ? `<p class="descricao">${item.descricao}</p>` : ''}
                        </div>
                        <p class="item-preco">${item.preco || ''}</p>
                    </div>
                `;
            } else {
                // Se TIVER tamanhos, renderiza o nome do item e uma lista de tamanhos/preços
                let tamanhosHtml = '';
                tamanhosSnapshot.forEach(tamanhoDoc => {
                    const tamanho = tamanhoDoc.data();
                    tamanhosHtml += `
                        <div class="item-menu sub-item">
                            <div class="item-info">
                                <p class="nome">${tamanho.nome}</p>
                            </div>
                            <p class="item-preco">${tamanho.preco}</p>
                        </div>
                    `;
                });
                itemHtml = `<h3 class="item-principal-titulo">${item.nome}</h3> ${tamanhosHtml}`;
            }

            return `<div class="card-categoria"><h2>${item.categoria}</h2>${itemHtml}</div>`;
        });
        
        // Espera todas as buscas de subcoleções terminarem e junta o HTML
        const finalHtmlArray = await Promise.all(cardapioHtmlPromises);
        
        // Agrupa por categoria para não repetir títulos
        const categorias = {};
        snapshot.docs.forEach((doc, index) => {
            const categoria = doc.data().categoria;
            if (!categorias[categoria]) {
                categorias[categoria] = '';
            }
            categorias[categoria] += finalHtmlArray[index].split('</h2>')[1].replace('</div>', '');
        });
        
        let finalHtml = '';
        for (const categoria in categorias) {
            finalHtml += `<div class="card-categoria"><h2>${categoria}</h2>${categorias[categoria]}</div>`;
        }

        container.innerHTML = finalHtml;

    } catch (error) {
        container.innerHTML = 'Falha ao carregar o cardápio. Tente novamente mais tarde.';
        console.error('Erro:', error);
    }
}