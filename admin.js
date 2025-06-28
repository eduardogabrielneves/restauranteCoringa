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
    // Referências a todos os elementos do HTML
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
    const searchIngredientsInput = document.getElementById('search-ingredients');
    const modalCloseXBtn = document.getElementById('modal-close-x-btn');

    const editLibraryItemModal = document.getElementById('edit-library-item-modal');
    const editLibraryItemForm = document.getElementById('edit-library-item-form');
    const cancelEditLibBtn = document.getElementById('cancel-edit-lib-btn');

    // Lógica de Autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
            carregarTudoAdmin();
        } else {
            adminPanel.style.display = 'none';
            loginContainer.style.display = 'block';
        }
    });
    loginForm.addEventListener('submit', (e) => { e.preventDefault(); auth.signInWithEmailAndPassword(loginForm.email.value, loginForm.password.value).catch(err => alert("Erro de login: " + err.message)); });
    logoutButton.addEventListener('click', () => auth.signOut());

    function carregarTudoAdmin() {
        carregarComposicaoDoDia();
        carregarOpcoesMarmita();
        carregarBiblioteca();
    }

    // --- LÓGICA DO MODAL (FUNÇÕES GENÉRICAS) ---
    function openModal(modalElement) {
        if (modalElement) {
            modalElement.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    }

    function closeModal(modalElement) {
        if (modalElement) {
            modalElement.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    // --- LÓGICA DA COMPOSIÇÃO DO DIA ---
    async function carregarComposicaoDoDia() {
        const docRef = db.collection("cardapio").doc("hoje");
        const docSnap = await docRef.get();
        
        acompanhamentosList.innerHTML = '';
        proteinasList.innerHTML = '';

        if (docSnap.exists) {
            const data = docSnap.data();
            const criarItemLi = (item, tipo) => {
                const li = document.createElement('li');
                li.draggable = true;
                li.classList.add('draggable-item');
                li.dataset.valor = item;
                li.dataset.tipo = tipo;
                li.textContent = item;
                return li;
            };
            (data.acompanhamentos || []).forEach(item => acompanhamentosList.appendChild(criarItemLi(item, 'acompanhamentos')));
            (data.proteinas || []).forEach(item => proteinasList.appendChild(criarItemLi(item, 'proteinas')));
        }
    }

    editCompositionBtn.addEventListener('click', async () => {
        const modalListContainer = document.getElementById('modal-ingredient-lists');
        modalListContainer.innerHTML = 'A carregar biblioteca...';
        
        const librarySnap = await db.collection("itens_biblioteca").orderBy("nome").get();
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
        acompanhamentos.forEach(nome => {
            const isChecked = (dailyMenuData.acompanhamentos || []).includes(nome);
            modalHtml += `<li><label><input type="checkbox" name="acompanhamento" value="${nome}" ${isChecked ? 'checked' : ''}> ${nome}</label></li>`;
        });
        modalHtml += '</ul></div>';
        
        modalHtml += '<div class="ingredient-column"><h3>Proteínas</h3><ul class="checkbox-list">';
        proteinas.forEach(nome => {
            const isChecked = (dailyMenuData.proteinas || []).includes(nome);
            modalHtml += `<li><label><input type="checkbox" name="proteina" value="${nome}" ${isChecked ? 'checked' : ''}> ${nome}</label></li>`;
        });
        modalHtml += '</ul></div>';
        
        modalListContainer.innerHTML = modalHtml;
        searchIngredientsInput.value = '';
        openModal(compositionModal);
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

        closeModal(compositionModal);
        carregarComposicaoDoDia();
    });
    
    cancelCompositionBtn.addEventListener('click', () => closeModal(compositionModal));
    modalCloseXBtn.addEventListener('click', () => closeModal(compositionModal));

    searchIngredientsInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#modal-ingredient-lists .checkbox-list li').forEach(li => {
            const ingredientName = li.textContent.trim().toLowerCase();
            li.style.display = ingredientName.includes(searchTerm) ? 'flex' : 'none';
        });
    });

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
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${item.nome}</strong> (${item.tipo})</span>
                <div class="library-item-actions">
                    <button class="edit-btn" data-id="${doc.id}">&#9998;</button>
                    <button class="delete-btn" data-id="${doc.id}">&times;</button>
                </div>
            `;
            libraryListContainer.appendChild(li);
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
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        
        if (target.classList.contains('delete-btn')) {
            if (confirm("Tem a certeza de que quer apagar este item da biblioteca permanentemente?")) {
                await db.collection("itens_biblioteca").doc(id).delete();
                carregarBiblioteca();
            }
        }
        
        if (target.classList.contains('edit-btn')) {
            const docRef = db.collection("itens_biblioteca").doc(id);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                document.getElementById('edit-lib-item-id').value = id;
                document.getElementById('edit-lib-item-name').value = data.nome;
                document.getElementById('edit-lib-item-type').value = data.tipo;
                openModal(editLibraryItemModal);
            }
        }
    });

    // --- LÓGICA DO MODAL DE EDIÇÃO DA BIBLIOTECA ---
    editLibraryItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-lib-item-id').value;
        const novoNome = document.getElementById('edit-lib-item-name').value;
        const novoTipo = document.getElementById('edit-lib-item-type').value;
        if (!id || !novoNome) return;
        await db.collection("itens_biblioteca").doc(id).update({ nome: novoNome, tipo: novoTipo });
        closeModal(editLibraryItemModal);
        carregarBiblioteca();
    });

    cancelEditLibBtn.addEventListener('click', () => closeModal(editLibraryItemModal));

    // --- LÓGICA DE DRAG AND DROP ---
    let draggedItem = null;
    [acompanhamentosList, proteinasList].forEach(list => {
        list.addEventListener('dragstart', e => {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });
        list.addEventListener('dragend', e => e.target.classList.remove('dragging'));
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(list, e.clientY);
            const currentlyDragging = document.querySelector('.dragging');
            if (afterElement == null) {
                list.appendChild(currentlyDragging);
            } else {
                list.insertBefore(currentlyDragging, afterElement);
            }
        });
        list.addEventListener('drop', async e => {
            e.preventDefault();
            if (!draggedItem) return;
            const tipo = draggedItem.dataset.tipo;
            const novaOrdem = Array.from(list.children).map(li => li.dataset.valor);
            try {
                await db.collection("cardapio").doc("hoje").update({ [tipo]: novaOrdem });
            } catch (error) {
                console.error("Erro ao salvar a nova ordem:", error);
                carregarComposicaoDoDia();
            }
        });
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.draggable-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Fecha os modais se clicar no overlay
    window.addEventListener('click', (e) => {
        if (e.target == compositionModal) closeModal(compositionModal);
        if (e.target == editLibraryItemModal) closeModal(editLibraryItemModal);
    });
});
