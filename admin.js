// Objeto de configuração que você pegou do site do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBBGlcMt4-L6_MdLSFlaqYxyfuu4oQ_4bw",
    authDomain: "restaurante-coringa-app.firebaseapp.com",
    projectId: "restaurante-coringa-app",
    storageBucket: "restaurante-coringa-app.firebasestorage.app",
    messagingSenderId: "328833049744",
    appId: "1:328833049744:web:6bd4459aebd35bd41f2415"
};

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos do HTML
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('login-error');
const menuListContainer = document.getElementById('menu-list-container');
const addItemForm = document.getElementById('add-item-form');
const editModal = document.getElementById('edit-modal');
const editItemForm = document.getElementById('edit-item-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');


// --- LÓGICA DE LOGIN ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            loginError.textContent = 'E-mail ou senha incorretos.';
            console.error("Erro de login:", error);
        });
});

// --- LÓGICA DE LOGOUT ---
logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// --- VERIFICA SE O USUÁRIO JÁ ESTÁ LOGADO ---
auth.onAuthStateChanged((user) => {
    if (user) {
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'block';
        carregarCardapioAdmin();
    } else {
        adminPanel.style.display = 'none';
        loginContainer.style.display = 'block';
    }
});


// --- FUNÇÃO PARA CARREGAR E EXIBIR O CARDÁPIO NO PAINEL ---
async function carregarCardapioAdmin() {
    if (!menuListContainer) return;
    menuListContainer.innerHTML = 'Carregando itens...';
    
    try {
        const snapshot = await db.collection("cardapio").orderBy("ordem").get();

        menuListContainer.innerHTML = '';
        if (snapshot.empty) {
            menuListContainer.innerHTML = 'Nenhum item no cardápio.';
        }
        
        snapshot.forEach(doc => {
            const item = doc.data();
            const itemId = doc.id;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item-admin';
            itemDiv.innerHTML = `
                <span><strong>${item.nome}</strong> (${item.categoria}) - ${item.preco || ''}</span>
                <div>
                    <button class="edit-btn" data-id="${itemId}">Editar</button>
                    <button class="delete-btn" data-id="${itemId}">Excluir</button>
                </div>
            `;
            menuListContainer.appendChild(itemDiv);
        });
    } catch (error) {
        console.error("Erro ao carregar o cardápio:", error);
        menuListContainer.innerHTML = 'Erro ao carregar o cardápio.';
    }
}


// --- EVENT LISTENER PRINCIPAL PARA A LISTA (EXCLUIR E EDITAR) ---
menuListContainer.addEventListener('click', async (e) => {
    // Lógica de Excluir
    if (e.target.classList.contains('delete-btn')) {
        const id = e.target.dataset.id;
        if (confirm("Tem certeza que deseja excluir este item?")) {
            try {
                await db.collection("cardapio").doc(id).delete();
                carregarCardapioAdmin();
            } catch (error) {
                console.error("Erro ao excluir item: ", error);
            }
        }
    }

    // Lógica de Editar
    if (e.target.classList.contains('edit-btn')) {
        const id = e.target.dataset.id;
        const docRef = db.collection("cardapio").doc(id);
        try {
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                document.getElementById('edit-item-id').value = id;
                document.getElementById('edit-item-categoria').value = data.categoria;
                document.getElementById('edit-item-nome').value = data.nome;
                document.getElementById('edit-item-descricao').value = data.descricao || '';
                document.getElementById('edit-item-preco').value = data.preco || '';
                document.getElementById('edit-item-ordem').value = data.ordem;
                editModal.style.display = 'flex';
            }
        } catch (error) {
            console.error("Erro ao buscar item para edição:", error);
        }
    }
});


// --- LÓGICA DO FORMULÁRIO DE ADICIONAR ITEM ---
addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const novoItem = {
        categoria: document.getElementById('item-categoria').value,
        nome: document.getElementById('item-nome').value,
        descricao: document.getElementById('item-descricao').value,
        preco: document.getElementById('item-preco').value,
        ordem: Number(document.getElementById('item-ordem').value)
    };

    if (!novoItem.categoria || !novoItem.nome || !novoItem.ordem) {
        alert("Por favor, preencha Categoria, Nome e Ordem.");
        return;
    }

    try {
        await db.collection("cardapio").add(novoItem);
        addItemForm.reset(); 
        carregarCardapioAdmin();
    } catch (error) {
        console.error("Erro ao adicionar novo item: ", error);
        alert("Ocorreu um erro ao adicionar o item.");
    }
});


// --- LÓGICA DO MODAL DE EDIÇÃO ---
// Salvar as alterações
editItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-item-id').value;
    const updatedData = {
        categoria: document.getElementById('edit-item-categoria').value,
        nome: document.getElementById('edit-item-nome').value,
        descricao: document.getElementById('edit-item-descricao').value,
        preco: document.getElementById('edit-item-preco').value,
        ordem: Number(document.getElementById('edit-item-ordem').value)
    };
    try {
        await db.collection("cardapio").doc(id).update(updatedData);
        editModal.style.display = 'none';
        carregarCardapioAdmin();
    } catch (error) {
        console.error("Erro ao atualizar o item:", error);
        alert("Falha ao atualizar o item.");
    }
});

// Cancelar/Fechar o modal
cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target == editModal) {
        editModal.style.display = 'none';
    }
});