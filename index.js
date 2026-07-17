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

// ===== AUTH =====

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("postBox").style.display = "block";
        document.getElementById("loggedInAs").textContent =
            `loggato come: ${user.displayName || user.email}`;
    } else {
        document.getElementById("loginBox").style.display = "block";
        document.getElementById("postBox").style.display = "none";
    }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    // Use username as a fake email for Firebase Auth
    const fakeEmail = `${username}@cissia.local`;
    const errorEl = document.getElementById("authError");
    errorEl.textContent = "";

    try {
        await signInWithEmailAndPassword(auth, fakeEmail, password);
    } catch (err) {
        errorEl.textContent = `// errore: ${friendlyAuthError(err.code)}`;
    }
});

document.getElementById("registerBtn").addEventListener("click", async () => {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const errorEl = document.getElementById("authError");
    errorEl.textContent = "";

    if (!username || !password) {
        errorEl.textContent = "// inserisci username e password";
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = "// la password deve avere almeno 6 caratteri";
        return;
    }

    const fakeEmail = `${username}@cissia.local`;
    try {
        const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        await updateProfile(cred.user, { displayName: username });
        // Refresh currentUser so displayName is available
        currentUser = auth.currentUser;
        document.getElementById("loggedInAs").textContent =
            `loggato come: ${username}`;
    } catch (err) {
        errorEl.textContent = `// errore: ${friendlyAuthError(err.code)}`;
    }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
});

function friendlyAuthError(code) {
    switch (code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "username o password errati";
        case "auth/email-already-in-use":
            return "username già in uso";
        case "auth/invalid-email":
            return "username non valido";
        case "auth/weak-password":
            return "password troppo corta (min. 6 caratteri)";
        default:
            return code;
    }
}

// ===== POSTS =====

document.getElementById("postForm").addEventListener("submit", addPost);
loadPosts();

const monthsIT = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

let posts = [];
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

let openComments = {};
let hits = Math.floor(Math.random() * 4000) + 1337;

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function pad(n, len) {
    return String(n).padStart(len, "0");
}

function formatTodayIT() {
    const d = new Date();
    return `${d.getDate()} ${monthsIT[d.getMonth()]} ${d.getFullYear()}`;
}

function render() {
    document.getElementById("hitCounter").textContent = pad(hits, 6);
    document.getElementById("postCounter").textContent = pad(posts.length, 2);

    const list = document.getElementById("postsList");
    if (posts.length === 0) {
        list.innerHTML = `<div class="empty-state">// nessun post ancora. scrivi qualcosa qui sopra //</div>`;
        return;
    }

    list.innerHTML = posts.map((p, idx) => {
        const commentsOpen = openComments[p.id] ? "open" : "";
        const commentsHTML = (p.comments || []).map(c =>
            `<div class="c"><b>${escapeHTML(c.author)}:</b> ${escapeHTML(c.text)}</div>`
        ).join("");

        return `
        <div class="post">
          <div class="post-title-row">
            <h2 class="post-title">${escapeHTML(p.title)}</h2>
            ${idx === 0 ? '<span class="new-tag">★ NUOVO ★</span>' : ''}
          </div>
          <div class="post-meta">
            posted by <span style="color:#39ff6a;">${escapeHTML(p.author || "anonimo")}</span>
            &nbsp;·&nbsp; ${escapeHTML(p.date || "")}
          </div>
          <div class="post-content">${escapeHTML(p.content)}</div>
          <div class="post-actions">
            <a onclick="toggleComments('${p.id}')">💬 commenti (${(p.comments||[]).length})</a>
            &nbsp;|&nbsp;
            <a onclick="deletePost('${p.id}')" style="color:#cc6666;">🗑 elimina</a>
          </div>
          <div class="comment-box ${commentsOpen}" id="comments-${p.id}">
            <div class="comment-list">${commentsHTML}</div>
            <div class="comment-form">
              <input type="text" id="commentInput-${p.id}" placeholder="lascia un commento..." />
              <button onclick="addComment('${p.id}')">invia</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
}

async function addPost(e) {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();
    if (!title || !content) return;

    await addDoc(postsRef, {
        title,
        content,
        author: currentUser.displayName || currentUser.email,
        date: formatTodayIT(),
        createdAt: Date.now(),
        comments: []
    });

    document.getElementById("postForm").reset();
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
    const input = document.getElementById(`commentInput-${id}`);
    const text = input.value.trim();
    if (!text) return;

    const post = posts.find(p => p.id === id);
    const authorName = currentUser
        ? (currentUser.displayName || currentUser.email)
        : "visitatore_anonimo";

    const updatedComments = [
        ...(post.comments || []),
        { author: authorName, text }
    ];

    await updateDoc(doc(db, "posts", id), { comments: updatedComments });
    await loadPosts();
}

render();

window.toggleComments = toggleComments;
window.deletePost = deletePost;
window.addComment = addComment;