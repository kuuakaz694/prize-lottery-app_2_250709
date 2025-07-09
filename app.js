// グローバル変数
let currentCourse = null;
let courses = {};
let deleteMode = false;
let initialRegisterTableBodyHTML = '';

// idで要素を取得するショートカット関数
function $(id) {
  return document.getElementById(id);
}

// === イベントリスナーの設定 ===

// ページ読み込み完了時の処理
window.onload = () => {
  initialRegisterTableBodyHTML = $('sheet-table').querySelector('tbody').innerHTML;
  const saved = localStorage.getItem("courses");
  if (saved) {
    try {
      courses = JSON.parse(saved);
      renderCourseButtons();
    } catch (e) {
      console.error("ローカルストレージのデータが壊れています。", e);
      localStorage.removeItem("courses");
    }
  }
};

// 景品登録ボタン
$('register-button').onclick = () => {
  resetRegisterScreen();
  $('top-screen').style.display = 'none';
  $('register-screen').style.display = 'block';
};

// --- ▼▼▼ ここが今回の修正箇所 ▼▼▼ ---
// 景品登録画面の保存ボタン
$('save-button').onclick = () => {
  const courseName = $('course-name').value.trim();
  if (!courseName) {
    alert("コース名を入力してください。");
    return;
  }

  const rows = document.querySelectorAll('#sheet-table tbody tr');
  const data = [];

  // バリデーション（入力チェック）を修正
  for (const row of rows) {
    // 各行の「最初のセル(td)の中にあるinput要素」を特定する、より確実な方法に変更
    const prizeInput = row.querySelector('td:first-child input');
    
    // prizeInputが見つからない、または、その中身が空の場合にエラーとする
    if (!prizeInput || !prizeInput.value.trim()) { 
      alert('エラー: 空の景品名があります。すべての景品名（prize）を入力してください。');
      return; // 処理を中断
    }
  }
  // --- ▲▲▲ バリデーションの修正ここまで ▲▲▲ ---


  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const prize = inputs[0].value.trim();
    const text = inputs[1].value;
    const quantity = parseInt(inputs[3].value) || 0;
    data.push({ prize, text, image: '', quantity });
  });

  courses[courseName] = data;

  currentCourse = null;
  $('start-button').disabled = true;
  renderCourseButtons();

  $('register-screen').style.display = 'none';
  $('top-screen').style.display = 'block';

  let filesToLoad = 0;
  rows.forEach((row, index) => {
    const imgFile = row.querySelectorAll('input')[2].files[0];
    if (imgFile) {
      filesToLoad++;
      const reader = new FileReader();
      reader.onload = (e) => {
        courses[courseName][index].image = e.target.result;
        filesToLoad--;
        if (filesToLoad === 0) {
          localStorage.setItem("courses", JSON.stringify(courses));
          console.log("全画像の保存が完了しました。");
        }
      };
      reader.readAsDataURL(imgFile);
    }
  });

  if (filesToLoad === 0) {
    localStorage.setItem("courses", JSON.stringify(courses));
  }
};

// 景品登録画面の戻るボタン
$('back-register-button').onclick = () => {
  $('register-screen').style.display = 'none';
  $('top-screen').style.display = 'block';
};

// 結果画面の戻るボタン
$('back-result-button').onclick = () => {
  $('result-screen').style.display = 'none';
  $('top-screen').style.display = 'block';
};

$('start-button').onclick = () => {
  try {
    if (!currentCourse) {
      alert('エラー: コースが選択されていません。');
      return;
    }
    const courseData = courses[currentCourse];
    if (!courseData || !Array.isArray(courseData)) {
      alert(`エラー: 「${currentCourse}」のコースデータが見つかりません。`);
      return;
    }
    const stock = courseData.filter(item => item && typeof item.quantity === 'number' && item.quantity > 0);
    if (stock.length === 0) {
      alert("このコースの景品はすべて在庫切れです。");
      return;
    }
    const selectedItem = stock[Math.floor(Math.random() * stock.length)];
    if (!selectedItem || typeof selectedItem.prize === 'undefined') {
      alert('抽選エラー: 景品データの取得に失敗しました。');
      return;
    }
    selectedItem.quantity--;
    localStorage.setItem("courses", JSON.stringify(courses));
    showAnimationScreen(selectedItem);
  } catch (error) {
    console.error("スタートボタンの処理中に予期せぬエラーが発生しました:", error);
    alert("抽選中にエラーが発生しました。アプリをリロードするか、景品データを再登録してみてください。");
  }
};

$('stock-button').onclick = () => {
  let message = '【景品在庫一覧】\n\n';
  const courseNames = Object.keys(courses);
  if (courseNames.length === 0) {
    message = '登録されているコースがありません。';
  } else {
    courseNames.forEach(name => {
      message += `▼ ${name}\n`;
      const items = courses[name] || [];
      items.forEach(item => {
        message += `  ${item.prize}: 残り ${item.quantity} 個\n`;
      });
      message += '\n';
    });
  }
  alert(message);
};

$('delete-toggle-button').onclick = () => {
  deleteMode = !deleteMode;
  $('delete-toggle-button').classList.toggle('active', deleteMode);
  renderCourseButtons();
};

// === 関数定義 ===

function resetRegisterScreen() {
  $('sheet-table').querySelector('tbody').innerHTML = initialRegisterTableBodyHTML;
  $('course-name').value = '';
}

function renderCourseButtons() {
  const container = $('course-buttons');
  container.innerHTML = '';
  Object.keys(courses).forEach(name => {
    const wrapper = document.createElement('div');
    wrapper.className = 'course-button-wrapper';
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.className = 'course-button';
    if (name === currentCourse) {
      btn.classList.add('selected');
    }
    btn.onclick = () => {
      if (deleteMode) return;
      document.querySelectorAll('.course-button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentCourse = name;
      $('start-button').disabled = false;
    };
    wrapper.appendChild(btn);
    if (deleteMode) {
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '×';
      deleteBtn.className = 'delete-icon';
      deleteBtn.onclick = () => {
        if (confirm(`「${name}」コースを本当に削除しますか？`)) {
          if (currentCourse === name) {
            currentCourse = null;
            $('start-button').disabled = true;
          }
          delete courses[name];
          localStorage.setItem("courses", JSON.stringify(courses));
          renderCourseButtons();
        }
      };
      wrapper.appendChild(deleteBtn);
    }
    container.appendChild(wrapper);
  });
}

function showAnimationScreen(item) {
  if (!item || typeof item.prize !== 'string' || item.prize.trim() === '') {
    console.error("showAnimationScreenに不正な景品データが渡されました:", item);
    alert("エラー: 景品データが不正なため、結果を直接表示します。");
    showResultScreen(item || { prize: 'エラー', text: '景品情報がありません', image: '' });
    return;
  }
  $('top-screen').style.display = 'none';
  let animScreen = $('anime-screen');
  if (!animScreen) {
    animScreen = document.createElement('div');
    animScreen.id = 'anime-screen';
    document.body.appendChild(animScreen);
  }
  animScreen.innerHTML = '';
  animScreen.style.display = 'flex';
  const anim = lottie.loadAnimation({
    container: animScreen,
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: `anime/${item.prize}.json`,
  });
  const goToResult = () => {
    if (animScreen.style.display === 'none') return;
    animScreen.style.display = 'none';
    showResultScreen(item);
  };
  anim.addEventListener('complete', goToResult);
  anim.addEventListener('data_failed', () => {
    console.warn(`アニメーションファイルが見つかりません: anime/${item.prize}.json`);
    setTimeout(goToResult, 1000);
  });
  const audio = new Audio(`sound/${item.prize}.mp3`);
  audio.play().catch(e => {
    console.warn(`音声ファイルの再生に失敗しました: sound/${item.prize}.mp3`);
  });
}

function showResultScreen(item) {
  $('result-prize').textContent = item ? item.prize : 'エラー';
  $('result-strings').textContent = item ? item.text : '景品情報がありません';
  const imgElement = $('result-image');
  if (item && item.image) {
    imgElement.src = item.image;
    imgElement.style.display = 'block';
  } else {
    imgElement.style.display = 'none';
  }
  $('result-screen').style.display = 'block';
}
