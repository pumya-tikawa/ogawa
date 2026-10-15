// APIのベースURL（スタックを作り直したら、新しいApiUrlに書き換える）
const API_BASE = "https://k20km8xvse.execute-api.ap-northeast-1.amazonaws.com";

const MAX_NAME = 30;
const MAX_BODY = 500;

const DEFAULT_NAME = "名無しのおがわ";

const section = document.getElementById("comments");

if (section) {
  const articleId = section.dataset.articleId;
  const endpoint = `${API_BASE}/articles/${encodeURIComponent(articleId)}/comments`;

  // 見出し・一覧・フォームの枠を作る
  const heading = document.createElement("h2");
  heading.textContent = "コメント";

  const statusEl = document.createElement("p");
  statusEl.className = "cm-status";

  const listEl = document.createElement("ul");
  listEl.className = "cm-list";

  const form = document.createElement("form");
  form.className = "cm-form";
  form.innerHTML = `
    <label>お名前
      <input type="text" name="name" value="名無しのおがわ"maxlength="${MAX_NAME}">
    </label>
    <label>コメント
      <textarea name="body" rows="4" maxlength="${MAX_BODY}" required></textarea>
    </label>
    <button type="submit">投稿する</button>
    <p class="cm-message" role="status"></p>
  `;
  // ↑ innerHTML は固定の文字だけ（投稿内容は入れていない）なので安全

  section.append(heading, statusEl, listEl, form);

  const submitButton = form.querySelector("button");
  const messageEl = form.querySelector(".cm-message");

  // コメント1件ぶんの表示（textContent なので投稿内容がHTMLとして実行されない）
  function createItem(comment) {
    const li = document.createElement("li");
    li.className = "cm-item";

    const name = document.createElement("span");
    name.className = "cm-name";
    name.textContent = comment.name;

    const date = document.createElement("time");
    date.className = "cm-date";
    date.dateTime = comment.createdAt;
    date.textContent = new Date(comment.createdAt).toLocaleString("ja-JP");

    const body = document.createElement("p");
    body.className = "cm-body";
    body.textContent = comment.body;

    li.append(name, date, body);
    return li;
  }

  async function loadComments() {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const comments = await res.json();

      listEl.replaceChildren(...comments.map(createItem));
      statusEl.textContent =
        comments.length === 0 ? "まだコメントはありません。最初の1件をどうぞ。" : "";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "コメントの読み込みに失敗しました。時間をおいて再度お試しください。";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.value.trim() || DEFAULT_NAME,
      body: form.body.value.trim(),
    };

    submitButton.disabled = true;
    messageEl.className = "cm-message";
    messageEl.textContent = "送信中…";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "投稿に失敗しました");

      messageEl.className = "cm-message cm-ok";
      messageEl.textContent = "投稿しました！";
      form.reset();
      await loadComments();
    } catch (err) {
      console.error(err);
      messageEl.className = "cm-message cm-error";
      messageEl.textContent = err.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  loadComments();
}