const monthsIT = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

let posts = [
    {
        id: 1647000000000,
        title: "il mio primo post!!1!",
        mood: "euforico",
        date: "12 marzo 2003",
        content: "Finalmente ho un posto tutto mio su internet! Mio cugino mi ha aiutato a fare l'upload via FTP, ci ho messo tre ore perché il modem si è disconnesso due volte. Comunque ciao a tutti quelli che leggono, scrivetemi su MSN se passate di qui.",
        comments: []
    },

];

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
            pubblicato il ${escapeHTML(p.date)} — mood: <span class="mood-tag">${escapeHTML(p.mood)}</span>
          </div>
          <div class="post-content">${escapeHTML(p.content)}</div>
          <div class="post-actions">
            <a onclick="toggleComments(${p.id})">💬 commenti (${(p.comments||[]).length})</a>
            &nbsp;|&nbsp;
            <a onclick="deletePost(${p.id})" style="color:#cc6666;">🗑 elimina</a>
          </div>
          <div class="comment-box ${commentsOpen}" id="comments-${p.id}">
            <div class="comment-list">${commentsHTML}</div>
            <div class="comment-form">
              <input type="text" id="commentInput-${p.id}" placeholder="lascia un commento..." />
              <button onclick="addComment(${p.id})">invia</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
}

function addPost(e) {
    e.preventDefault();
    const title = document.getElementById("postTitle").value.trim();
    const mood = document.getElementById("postMood").value;
    const content = document.getElementById("postContent").value.trim();
    if (!title || !content) return;

    posts.unshift({
        id: Date.now(),
        title,
        mood,
        date: formatTodayIT(),
        content,
        comments: []
    });
    hits += 1;
    document.getElementById("postForm").reset();
    document.getElementById("postMood").value = "metallaro";
    render();
}

function deletePost(id) {
    if (!confirm("Sicuro di voler eliminare questo post? Non c'è un cestino, sparisce per sempre.")) return;
    posts = posts.filter(p => p.id !== id);
    render();
}

function toggleComments(id) {
    openComments[id] = !openComments[id];
    render();
}

function addComment(id) {
    const input = document.getElementById(`commentInput-${id}`);
    const text = input.value.trim();
    if (!text) return;
    const post = posts.find(p => p.id === id);
    post.comments.push({ author: "visitatore_anonimo", text });
    openComments[id] = true;
    render();
}

render();