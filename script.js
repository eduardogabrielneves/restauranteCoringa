// Objeto de configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBBGlcMt4-L6_MdLSFlaqYxyfuu4oQ_4bw",
    authDomain: "restaurante-coringa-app.firebaseapp.com",
    projectId: "restaurante-coringa-app",
    storageBucket: "restaurante-coringa-app.firebasestorage.app",
    messagingSenderId: "328833049744",
    appId: "1:328833049744:web:6bd4459aebd35bd41f2415"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let carrinho = JSON.parse(localStorage.getItem('carrinhoRestauranteCoringa')) || [];

function salvarCarrinho() {
    localStorage.setItem('carrinhoRestauranteCoringa', JSON.stringify(carrinho));
}

carrinho.forEach((item, index) => {
    if (!item.id) {
        item.id = Date.now() + index;
    }
});
salvarCarrinho();

// Lógica para a instalação do PWA
let deferredPrompt;
const installPwaBtn = document.getElementById('install-pwa-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installPwaBtn) {
    installPwaBtn.style.display = 'block';
  }
});

if (installPwaBtn) {
    installPwaBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('Utilizador aceitou instalar o PWA');
                installPwaBtn.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });
}

window.addEventListener('appinstalled', () => {
  if (installPwaBtn) {
    installPwaBtn.style.display = 'none';
  }
  deferredPrompt = null;
  console.log('PWA foi instalado');
});

// Código executado quando a página carrega
document.addEventListener("DOMContentLoaded", () => {
    const dataElemento = document.getElementById('data-atual');
    if (dataElemento) {
        dataElemento.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    renderizarCarrinho();
    carregarCardapioDoDia();

    const fabCarrinho = document.getElementById('fab-carrinho');
    const sidePanelCarrinho = document.getElementById('side-panel-carrinho');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const panelOverlay = document.getElementById('panel-overlay');
    const carrinhoItensContainer = document.getElementById('carrinho-itens');
    const finalizarPedidoBtn = document.getElementById('finalizar-pedido-btn');

    function togglePanel() {
        sidePanelCarrinho.classList.toggle('open');
        panelOverlay.classList.toggle('open');
    }

    fabCarrinho.addEventListener('click', togglePanel);
    closePanelBtn.addEventListener('click', togglePanel);
    panelOverlay.addEventListener('click', togglePanel);

    carrinhoItensContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = Number(target.dataset.id);
        if (isNaN(id)) return;
        if (target.classList.contains('remove-all-btn')) removerItemTotalmente(id);
        else if (target.classList.contains('decrease-qty-btn')) diminuirQuantidade(id);
        else if (target.classList.contains('increase-qty-btn')) aumentarQuantidade(id);
    });

    finalizarPedidoBtn.addEventListener('click', () => {
        if (carrinho.length === 0) return alert("O seu carrinho está vazio!");
        let mensagem = '*NOVO PEDIDO - RESTAURANTE CORINGA*\n\nOlá! Gostaria de fazer o seguinte pedido:\n\n';
        carrinho.forEach(item => {
            const obsMsg = item.obs ? `\n  - Obs: ${item.obs}` : '';
            mensagem += `*${item.quantidade}x* ${item.nome} ${item.tamanho || ''}${obsMsg}\n`;
        });
        mensagem += `\n-------------------------\n*${document.getElementById('carrinho-total').innerText}*\n\n`;
        mensagem += '-------------------------\n\n*Nome do Cliente:*\n\n*Endereço de Entrega:*\n\n*Forma de Pagamento:*\n';
        const linkWhatsApp = `https://wa.me/5549998039321?text=${encodeURIComponent(mensagem)}`;
        window.open(linkWhatsApp, '_blank');
        setTimeout(() => {
            if (confirm("O seu pedido foi enviado para o WhatsApp! Deseja limpar o carrinho agora?")) {
                carrinho = [];
                salvarCarrinho();
                renderizarCarrinho();
            }
        }, 1500);
    });
});

async function carregarCardapioDoDia() {
    const menuContainer = document.getElementById('menu-container');
    const builderContainer = document.getElementById('marmita-builder');
    menuContainer.innerHTML = '<div class="card-categoria"><p>A carregar o cardápio...</p></div>';

    try {
        const docRef = db.collection("cardapio").doc("hoje");
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            menuContainer.innerHTML = '<div class="card-categoria"><p>O cardápio de hoje ainda não foi definido. Volte mais tarde!</p></div>';
            if(builderContainer) builderContainer.style.display = 'none';
            return;
        }

        const data = docSnap.data();
        let htmlIngredientes = '';

        const ingredientes = (data.acompanhamentos || []).concat(data.proteinas || []);
        if (ingredientes.length > 0) {
            htmlIngredientes = '<div class="card-categoria"><h2>Composição do Prato</h2><ul class="lista-ingredientes">';
            ingredientes.forEach(item => { htmlIngredientes += `<li>${item}</li>`; });
            htmlIngredientes += '</ul></div>';
        }
        menuContainer.innerHTML = htmlIngredientes;

        const proteinaSelect = document.getElementById('proteina-select');
        const tamanhoSelect = document.getElementById('tamanho-select');

        if(proteinaSelect) {
            proteinaSelect.innerHTML = '<option value="" disabled selected>Selecione uma opção</option>';
            (data.proteinas || []).forEach(proteina => {
                proteinaSelect.innerHTML += `<option value="${proteina}">${proteina}</option>`;
            });
        }

        const opcoesSnapshot = await docRef.collection("opcoes_marmita").get();
        if (!opcoesSnapshot.empty && tamanhoSelect) {
            tamanhoSelect.innerHTML = '<option value="" disabled selected>Selecione uma opção</option>';
            opcoesSnapshot.forEach(opcaoDoc => {
                const opcao = opcaoDoc.data();
                tamanhoSelect.innerHTML += `<option value="${opcao.nome}" data-preco="${opcao.preco}">${opcao.nome} - ${opcao.preco}</option>`;
            });
            if(builderContainer) builderContainer.style.display = 'block';
        } else {
            if(builderContainer) builderContainer.style.display = 'none';
        }

        const addMarmitaBtn = document.getElementById('add-marmita-btn');
        if(addMarmitaBtn) {
            addMarmitaBtn.addEventListener('click', () => {
                const proteina = proteinaSelect.value;
                const tamanho = tamanhoSelect.value;
                const obsText = document.getElementById('marmita-obs').value.trim();
                
                if (!proteina || !tamanho) {
                    alert("Por favor, escolha uma proteína e um tamanho para a sua marmita.");
                    return;
                }
                const preco = tamanhoSelect.options[tamanhoSelect.selectedIndex].dataset.preco;

                adicionarAoCarrinho({
                    nome: `Marmita (c/ ${proteina})`,
                    tamanho: tamanho,
                    preco: preco,
                    obs: obsText,
                    id: Date.now()
                });
                
                proteinaSelect.value = "";
                tamanhoSelect.value = "";
                document.getElementById('marmita-obs').value = "";
            });
        }

    } catch (error) {
        console.error("Erro ao carregar cardápio:", error);
        menuContainer.innerHTML = "<div class='card-categoria'><p>Ocorreu um erro ao carregar o cardápio. Tente recarregar a página.</p></div>";
    }
}

function adicionarAoCarrinho(item) {
    const itemExistente = item.obs ? null : carrinho.find(i => i.nome === item.nome && i.tamanho === item.tamanho && !i.obs);
    
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({ ...item, quantidade: 1, id: item.id || Date.now() });
    }
    
    salvarCarrinho();
    renderizarCarrinho();
    
    const sidePanel = document.getElementById('side-panel-carrinho');
    if (!sidePanel.classList.contains('open')) {
        sidePanel.classList.add('open');
        document.getElementById('panel-overlay').classList.add('open');
    }
}

function diminuirQuantidade(id) {
    const itemIndex = carrinho.findIndex(i => i.id === id);
    if (itemIndex > -1) {
        if (carrinho[itemIndex].quantidade > 1) {
            carrinho[itemIndex].quantidade--;
        } else {
            carrinho.splice(itemIndex, 1);
        }
    }
    salvarCarrinho();
    renderizarCarrinho();
}

function aumentarQuantidade(id) {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.quantidade++;
    }
    salvarCarrinho();
    renderizarCarrinho();
}

function removerItemTotalmente(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    salvarCarrinho();
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const carrinhoItensContainer = document.getElementById('carrinho-itens');
    const carrinhoTotalEl = document.getElementById('carrinho-total');
    const fabBadge = document.getElementById('fab-badge');
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

    fabBadge.style.display = totalItens > 0 ? 'flex' : 'none';
    fabBadge.textContent = totalItens;

    if (carrinho.length === 0) {
        carrinhoItensContainer.innerHTML = '<p>O seu carrinho está vazio.</p>';
        carrinhoTotalEl.innerHTML = '<strong>Total: R$ 0,00</strong>';
        return;
    }

    carrinhoItensContainer.innerHTML = '';
    let total = 0;

    carrinho.forEach(item => {
        try {
            const precoOriginal = parseFloat(item.preco.replace('R$ ', '').replace(',', '.'));
            total += precoOriginal * item.quantidade;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-menu';
            const obsHtml = item.obs ? `<p class="cart-item-obs">Obs: ${item.obs}</p>` : '';

            itemDiv.innerHTML = `
                <div class="item-info">
                    <p class="nome">${item.nome} ${item.tamanho || ''}</p>
                    ${obsHtml}
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="decrease-qty-btn" data-id="${item.id}">-</button>
                        <span>${item.quantidade}</span>
                        <button class="increase-qty-btn" data-id="${item.id}">+</button>
                    </div>
                    <p class="item-preco">R$ ${(precoOriginal * item.quantidade).toFixed(2).replace('.', ',')}</p>
                    <button class="remove-all-btn" data-id="${item.id}">&times;</button>
                </div>
            `;
            carrinhoItensContainer.appendChild(itemDiv);
        } catch (e) {
            console.error("Erro ao renderizar item do carrinho:", item, e);
        }
    });
    
    carrinhoTotalEl.innerHTML = `<strong>Total: R$ ${total.toFixed(2).replace('.', ',')}</strong>`;
}
