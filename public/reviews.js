// API の URL（スタックを作り直したら、新しい ApiUrl に書き換える）
const API_URL = "https://u8wexsqex3.execute-api.ap-northeast-1.amazonaws.com/reviews";

const listEl = document.getElementById("review-list");
const listStatusEl = document.getElementById("list-status");
const formEl = document.getElementById("review-form");
const messageEl = document.getElementById("form-message");
const submitButton = document.getElementById("submit-button");

// 星の表示（例：4 → ★★★★☆）
function stars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

// レビュー1件ぶんの表示を作る
// textContent を使うので、投稿された文字が HTML として実行されることはない
function createItem(review) {
  const li = document.createElement("li");
  li.className = "rv-card";

  const head = document.createElement("div");
  head.className = "rv-item-head";

  const title = document.createElement("span");
  title.className = "rv-title";
  title.textContent = review.title;

  const rating = document.createElement("span");
  rating.className = "rv-stars";
  rating.textContent = stars(review.rating);

  head.append(title, rating);

  const comment = document.createElement("p");
  comment.className = "rv-comment";
  comment.textContent = review.comment || "";

  const date = document.createElement("span");
  date.className = "rv-date";
  date.textContent = new Date(review.createdAt).toLocaleString("ja-JP");

  li.append(head, comment, date);
  return li;
}

// 一覧を取得して表示する
async function loadReviews() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const reviews = await res.json();

    listEl.replaceChildren(...reviews.map(createItem));
    listStatusEl.textContent = reviews.length === 0 ? "まだレビューがありません。最初の1件を投稿してみてください。" : "";
  } catch (err) {
    console.error(err);
    listStatusEl.textContent = "レビューの読み込みに失敗しました。時間をおいて再度お試しください。";
  }
}

// フォームの内容を投稿する
formEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: formEl.title.value.trim(),
    rating: Number(formEl.rating.value),
    comment: formEl.comment.value.trim(),
  };

  submitButton.disabled = true;
  messageEl.className = "rv-message";
  messageEl.textContent = "送信中…";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      // API が返した理由（入力チェックのメッセージ）をそのまま表示する
      throw new Error(data.message || "投稿に失敗しました");
    }

    messageEl.className = "rv-message rv-ok";
    messageEl.textContent = "投稿しました！";
    formEl.reset();
    await loadReviews();
  } catch (err) {
    console.error(err);
    messageEl.className = "rv-message rv-error";
    messageEl.textContent = err.message;
  } finally {
    submitButton.disabled = false;
  }
});

loadReviews();
