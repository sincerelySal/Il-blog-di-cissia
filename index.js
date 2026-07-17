import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    orderBy,
    query,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ===== FIREBASE SETUP =====

const firebaseConfig = {
    apiKey: "AIzaSyArZ9h9PejHQN1lUt8fu2u9M5GKTq81yJw",
    authDomain: "cissias-blog.firebaseapp.com",
    projectId: "cissias-blog",
    storageBucket: "cissias-blog.firebasestorage.app",
    messagingSenderId: "799587159765",
    appId: "1:799587159765:web:3a1b87982b8df9b40b1c5c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const postsRef = collection(db, "posts");

// ===== CONSTANTS =====

const MONTHS_IT = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
];

const hits = Math.floor(Math.random() * 4000) + 1337;

// ===== DOM HELPERS =====

function getEl(id) {
    return document.getElementById(id);
}

function setDisplay(id, value) {
    getEl(id).style.display = value;
}

// ===== AUTH =====

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        setDisplay("loginBox", "none");
        setDisplay("postBox", "block");
        getEl("loggedInAs").textContent = `loggato come: ${user.displayName || user.email}`;
        getEl("postDate").value = getDefault2003DateISO();
    } else {
        setDisplay("loginBox", "block");
        setDisplay("postBox", "none");
    }
});

function getAuthCredentials() {
    const username = getEl("loginUsername").value.trim();
    const password = getEl("loginPassword").value.trim();
    const fakeEmail = `${username}@cissia.local`;
    return { username, password, fakeEmail };
}

function setAuthError(message) {
    getEl("authError").textContent = message;
}

function friendlyAuthError(code) {
    const errors = {
        "auth/user-not-found": "username o password errati",
        "auth/wrong-password": "username o password errati",
        "auth/invalid-credential": "username o password errati",
        "auth/email-already-in-use": "username già in uso",
        "auth/invalid-email": "username non valido",
        "auth/weak-password": "password troppo corta (min. 6 caratteri)"
    };
    return errors[code] ?? code;
}

getEl("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthError("");

    const { fakeEmail, password } = getAuthCredentials();
    try {
        await signInWithEmailAndPassword(auth, fakeEmail, password);
    } catch (err) {
        setAuthError(`// errore: ${friendlyAuthError(err.code)}`);
    }
});

getEl("registerBtn").addEventListener("click", async () => {
    setAuthError("");

    const { username, password, fakeEmail } = getAuthCredentials();
    if (!username || !password) {
        setAuthError("// inserisci username e password");
        return;
    }
    if (password.length < 6) {
        setAuthError("// la password deve avere almeno 6 caratteri");
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        await updateProfile(cred.user, { displayName: username });
        currentUser = auth.currentUser;
        getEl("loggedInAs").textContent = `loggato come: ${username}`;
    } catch (err) {
        setAuthError(`// errore: ${friendlyAuthError(err.code)}`);
    }
});

getEl("logoutBtn").addEventListener("click", () => signOut(auth));

// ===== UTILITIES =====

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function pad(n, len) {
    return String(n).padStart(len, "0");
}

function formatDateIT(isoString) {
    const [year, month, day] = isoString.split("-").map(Number);
    return `${day} ${MONTHS_IT[month - 1]} ${year}`;
}

function getDefault2003DateISO() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `2003-${month}-${day}`;
}

function getCurrentUserName() {
    return currentUser
        ? (currentUser.displayName || currentUser.email)
        : "visitatore_anonimo";
}

// ===== POSTS =====

let posts = [];
let openComments = {};

async function loadPosts() {
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    posts = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        comments: d.data().comments || []
    }));

    render();
}

function renderCommentHTML(comment) {
    return `<div class="c"><b>${escapeHTML(comment.author)}:</b> ${escapeHTML(comment.text)}</div>`;
}

function renderPostHTML(post, index) {
    const commentsOpen = openComments[post.id] ? "open" : "";
    const commentsHTML = (post.comments || []).map(renderCommentHTML).join("");
    const isNewest = index === 0;

    return `
        <div class="post">
          <div class="post-title-row">
            <h2 class="post-title">${escapeHTML(post.title)}</h2>
            ${isNewest ? '<span class="new-tag">★ NUOVO ★</span>' : ""}
          </div>
          <div class="post-meta">
            posted by <span style="color:#39ff6a;">${escapeHTML(post.author || "anonimo")}</span>
            &nbsp;·&nbsp; ${escapeHTML(post.date || "")}
          </div>
          <div class="post-content">${escapeHTML(post.content)}</div>
          <div class="post-actions">
            <a onclick="toggleComments('${post.id}')">💬 commenti (${post.comments.length})</a>
            &nbsp;|&nbsp;
            <a onclick="deletePost('${post.id}')" style="color:#cc6666;">🗑 elimina</a>
          </div>
          <div class="comment-box ${commentsOpen}" id="comments-${post.id}">
            <div class="comment-list">${commentsHTML}</div>
            <div class="comment-form">
              <input type="text" id="commentInput-${post.id}" placeholder="lascia un commento..." />
              <button onclick="addComment('${post.id}')">invia</button>
            </div>
          </div>
        </div>
    `;
}

function render() {
    getEl("hitCounter").textContent = pad(hits, 6);
    getEl("postCounter").textContent = pad(posts.length, 2);

    const list = getEl("postsList");

    if (posts.length === 0) {
        list.innerHTML = `<div class="empty-state">// nessun post ancora. scrivi qualcosa qui sopra //</div>`;
        return;
    }

    list.innerHTML = posts.map(renderPostHTML).join("");
}

async function addPost(e) {
    e.preventDefault();
    if (!currentUser) return;

    const title = getEl("postTitle").value.trim();
    const content = getEl("postContent").value.trim();
    const dateISO = getEl("postDate").value;
    if (!title || !content || !dateISO) return;

    await addDoc(postsRef, {
        title,
        content,
        author: currentUser.displayName || currentUser.email,
        date: formatDateIT(dateISO),
        createdAt: Date.now(),
        comments: []
    });

    getEl("postForm").reset();
    getEl("postDate").value = getDefault2003DateISO();
    await loadPosts();
}

async function deletePost(id) {
    if (!confirm("Eliminare?")) return;
    await deleteDoc(doc(db, "posts", id));
    await loadPosts();
}

function toggleComments(id) {
    openComments[id] = !openComments[id];
    render();
}

async function addComment(id) {
    const input = getEl(`commentInput-${id}`);
    const text = input.value.trim();
    if (!text) return;

    const post = posts.find(p => p.id === id);
    const updatedComments = [
        ...(post.comments || []),
        { author: getCurrentUserName(), text }
    ];

    await updateDoc(doc(db, "posts", id), { comments: updatedComments });
    await loadPosts();
}

// ===== INIT =====

getEl("postForm").addEventListener("submit", addPost);
loadPosts();

window.toggleComments = toggleComments;
window.deletePost = deletePost;
window.addComment = addComment;