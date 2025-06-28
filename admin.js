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
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    // Referências aos elementos do HTML
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const acompanhamentosList = document.getElementById('acompanhamentos-list');
    const proteinasList = document.getElementById('proteinas-list');
    const addOptionForm = document.getElementById('add-option-form');
    const optionsList = document.getElementById('options-list');
    const addLibraryItemForm = document.getElementById('add-library-item-form');
    const libraryListContainer = document.getElementById('library-list-container');
    const editCompositionBtn = document.getElementById('edit-composition-btn');
    const compositionModal = document.getElementById('composition-modal');
    const cancelCompositionBtn = document.getElementById('cancel-composition-btn');
    const compositionForm = document.getElementById('composition-form');

    // Lógica de Autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
            carregarComposicaoDoDia();
            carregarOpcoesMarmita();
            carregarBiblioteca();
        } else {
            adminPanel.style.display = 'none';
            loginContainer.style.display = 'block';
        }
    });
    loginForm.addEventListener('submit', (e) => { e.preventDefault(); auth.signInWithEmailAndPassword(loginForm.email.value, loginForm.password.value).catch(err => console.error("Erro de login:", err)); });
    logoutButton.addEventListener('click', () => auth.signOut());

    // --- LÓGICA DA COMPOSIÇÃO DO DIA ---
    async function carregarComposicaoDoDia() {
        const docRef = db.collection("cardapio").doc("hoje");
        const docSnap = await docRef.get();
        acompanhamentosList.innerHTML = '';
        proteinasList.innerHTML = '';
        if (docSnap.exists) {
            const data = docSnap.data();
            (data.acompanhamentos || []).forEach(item => acompanhamentosList.innerHTML += `<li>${item}</li>`);
            (data.proteinas || []).forEach(item => proteinasList.innerHTML += `<li>${item}</li>`);
        }
    }

    editCompositionBtn.addEventListener('click', async () => {
        const modalListContainer = document.getElementById('modal-ingredient-lists');
        modalListContainer.innerHTML = 'A carregar biblioteca...';
        
        const librarySnap = await db.collection("itens_biblioteca").get();
        const dailyMenuSnap = await db.collection("cardapio").doc("hoje").get();
        const dailyMenuData = dailyMenuSnap.exists ? dailyMenuSnap.data() : { acompanhamentos: [], proteinas: [] };

        let acompanhamentos = [];
        let proteinas = [];
        librarySnap.forEach(doc => {
            const item = doc.data();
            if (item.tipo === 'Acompanhamento') acompanhamentos.push(item.nome);
            else if (item.tipo === 'Proteína') proteinas.push(item.nome);
        });
        
        let modalHtml = '<div class="ingredient-column"><h3>Acompanhamentos</h3><ul class="checkbox-list">';
        acompanhamentos.sort().forEach(nome => {
            const isChecked = (dailyMenuData.acompanhamentos || []).includes(nome);
            modalHtml += `<li><label><input type="checkbox" name="acompanhamento" value="${nome}" ${isChecked ? 'checked' : ''}> ${nome}</label></li>`;
        });
        modalHtml += '</ul></div>';
        
        modalHtml += '<div class="ingredient-column"><h3>Proteínas</h3><ul class="checkbox-list">';
        proteinas.sort().forEach(nome => {
            const isChecked = (dailyMenuData.proteinas || []).includes(nome);
            modalHtml += `<li><label><input type="checkbox" name="proteina" value="${nome}" ${isChecked ? 'checked' : ''}> ${nome}</label></li>`;
        });
        modalHtml += '</ul></div>';
        
        modalListContainer.innerHTML = modalHtml;
        compositionModal.style.display = 'flex';
    });

    compositionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const acompanhamentosChecks = document.querySelectorAll('input[name="acompanhamento"]:checked');
        const proteinasChecks = document.querySelectorAll('input[name="proteina"]:checked');

        const novosAcompanhamentos = Array.from(acompanhamentosChecks).map(el => el.value);
        const novasProteinas = Array.from(proteinasChecks).map(el => el.value);

        await db.collection("cardapio").doc("hoje").set({
            acompanhamentos: novosAcompanhamentos,
            proteinas: novasProteinas
        }, { merge: true });

        compositionModal.style.display = 'none';
        carregarComposicaoDoDia();
    });
    
    cancelCompositionBtn.addEventListener('click', () => compositionModal.style.display = 'none');

    // --- LÓGICA PARA GERIR AS OPÇÕES DE MARMITA ---
    async function carregarOpcoesMarmita() {
        const snapshot = await db.collection("cardapio").doc("hoje").collection("opcoes_marmita").get();
        optionsList.innerHTML = '';
        snapshot.forEach(doc => {
            const opcao = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${opcao.nome}</strong> - ${opcao.preco}</span> <button class="delete-btn" data-id="${doc.id}">&times;</button>`;
            optionsList.appendChild(li);
        });
    }

    addOptionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('option-name').value;
        const preco = document.getElementById('option-price').value;
        if (!nome || !preco) return alert("Nome e preço são obrigatórios.");

        await db.collection("cardapio").doc("hoje").collection("opcoes_marmita").add({ nome, preco });
        addOptionForm.reset();
        carregarOpcoesMarmita();
    });

    optionsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            if (confirm("Tem certeza que quer apagar esta opção de marmita?")) {
                await db.collection("cardapio").doc("hoje").collection("opcoes_marmita").doc(id).delete();
                carregarOpcoesMarmita();
            }
        }
    });

    // --- LÓGICA DA BIBLIOTECA DE ITENS ---
    async function carregarBiblioteca() {
        const snapshot = await db.collection("itens_biblioteca").orderBy("nome").get();
        libraryListContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const item = doc.data();
            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item-admin';
            itemDiv.innerHTML = `<span><strong>${item.nome}</strong> (${item.tipo})</span> <button class="delete-btn" data-id="${doc.id}">&times;</button>`;
            libraryListContainer.appendChild(itemDiv);
        });
    }

    addLibraryItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('lib-item-name').value;
        const tipo = document.getElementById('lib-item-type').value;
        if (!nome) return;
        await db.collection("itens_biblioteca").add({ nome, tipo });
        addLibraryItemForm.reset();
        carregarBiblioteca();
    });

    libraryListContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            if (confirm("Tem a certeza de que quer apagar este item da biblioteca permanentemente?")) {
                await db.collection("itens_biblioteca").doc(id).delete();
                carregarBiblioteca();
            }
        }
    });
});
