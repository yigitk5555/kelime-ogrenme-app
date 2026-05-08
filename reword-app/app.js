let currentLevel = "";
let activeWords = [];
let knownWords = [];
let currentWord = null;
let totalLevelWords = 0;
let isStudyMode = false;
let dailyCount = parseInt(localStorage.getItem('dailyCount')) || 0;

window.onload = function() {
    checkMissedWords();
    updateStats();
};

// 📌 İSTATİSTİK YÖNETİMİ
function updateStats() {
    document.getElementById("todayCount").innerText = dailyCount;
    let total = 0;
    // Sadece Zorlandığım Kelimeler modunda başarılı olanları saymak için ayrı bir depolama da yapılabilir
    // Şimdilik genel günlük başarıyı gösteriyoruz
    document.getElementById("totalKnownCount").innerText = localStorage.getItem('totalSuccess') || 0;
}

// 📌 SEVİYE SEÇİMİ
window.selectLevel = async function(level) {
    currentLevel = level;
    isStudyMode = false;
    try {
        const response = await fetch(`./${level}.json`);
        const allWords = await response.json();
        totalLevelWords = allWords.length;
        
        const savedKnown = localStorage.getItem(`known_${level}`);
        knownWords = savedKnown ? JSON.parse(savedKnown) : [];
        
        // Normal modda bildiklerini gösterme
        activeWords = allWords.filter(w => !knownWords.some(k => k.word === w.word));
        
        if (activeWords.length === 0) {
            showCongrats("Bu bölümdeki tüm kelimeleri bitirdin!");
            return;
        }
        startApp();
    } catch (e) { alert("Dosya yüklenemedi: " + level + ".json"); }
};

function startApp() {
    document.getElementById("levelScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";
    document.getElementById("congratsScreen").style.display = "none";
    nextWord();
}

window.nextWord = function() {
    if (activeWords.length === 0) {
        showCongrats(isStudyMode ? "Zorlandığın kelimeleri öğrendin! 🎉" : "Harika, tüm kelimeleri geçtin!");
        return;
    }
    const randomIndex = Math.floor(Math.random() * activeWords.length);
    currentWord = activeWords[randomIndex];

    document.getElementById("word").innerText = currentWord.word;
    document.getElementById("infoBox").style.display = "none";
    document.getElementById("mainButtons").style.display = "flex";
    updateProgressBar();
};

// 📌 CEVAPLAMA (SAYAÇ MANTIĞI BURADA)
window.answer = async function(knows) {
    if (!currentWord) return;

    if (knows) {
        // --- İSTEK: Sadece 'Zorlandığım Kelimeler' modunda sayaç çalışsın ---
        if (isStudyMode) {
            dailyCount++;
            localStorage.setItem('dailyCount', dailyCount);
            
            let totalSuccess = parseInt(localStorage.getItem('totalSuccess')) || 0;
            totalSuccess++;
            localStorage.setItem('totalSuccess', totalSuccess);
        }

        // Kelimeyi bildiklerin listesine ekle (Normal modda sadece listeyi temizler)
        if (!isStudyMode) {
            knownWords.push(currentWord);
            localStorage.setItem(`known_${currentLevel}`, JSON.stringify(knownWords));
        }
        
        // Zorlandığın listeden kelimeyi sil
        let missed = JSON.parse(localStorage.getItem('missed_words')) || [];
        missed = missed.filter(m => m.word !== currentWord.word);
        localStorage.setItem('missed_words', JSON.stringify(missed));

        activeWords = activeWords.filter(w => w.word !== currentWord.word);
        updateStats();
        nextWord();
    } else {
        // Bilmiyorum -> Hata listesine ekle
        let missed = JSON.parse(localStorage.getItem('missed_words')) || [];
        if (!missed.some(m => m.word === currentWord.word)) {
            missed.push(currentWord);
            localStorage.setItem('missed_words', JSON.stringify(missed));
        }
        showDetails();
    }
    checkMissedWords();
};

async function showDetails() {
    document.getElementById("mainButtons").style.display = "none";
    document.getElementById("meaning").innerText = currentWord.meaning;
    const list = document.getElementById("examples");
    list.innerHTML = "<li>Cümle aranıyor...</li>";
    
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${currentWord.word}`);
        const data = await res.json();
        let exHtml = "";
        if (data[0]) {
            data[0].meanings.forEach(m => m.definitions.forEach(d => {
                if (d.example) exHtml += `<li>${d.example}</li>`;
            }));
        }
        list.innerHTML = exHtml || "<li>Hazır örnek cümle bulunamadı.</li>";
    } catch (e) { list.innerHTML = "<li>Bağlantı hatası.</li>"; }
    
    document.getElementById("infoBox").style.display = "block";
}

window.speakWord = function() {
    const ut = new SpeechSynthesisUtterance(currentWord.word);
    ut.lang = 'en-US';
    window.speechSynthesis.speak(ut);
};

function updateProgressBar() {
    if (totalLevelWords === 0) return;
    const percent = (knownWords.length / totalLevelWords) * 100;
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressText").innerText = `${knownWords.length} / ${totalLevelWords}`;
}

function checkMissedWords() {
    const missed = JSON.parse(localStorage.getItem('missed_words')) || [];
    const btn = document.getElementById("missedWordsBtn");
    if (missed.length > 0) {
        btn.style.display = "block";
        btn.innerText = `⚠️ Zorlandığım Kelimeler (${missed.length})`;
    } else {
        btn.style.display = "none";
    }
}

window.studyMissedWords = function() {
    activeWords = JSON.parse(localStorage.getItem('missed_words')) || [];
    if (activeWords.length === 0) return;
    isStudyMode = true;
    totalLevelWords = activeWords.length;
    knownWords = []; 
    startApp();
};

window.goToMainMenu = function() { location.reload(); };

function showCongrats(m) {
    document.getElementById("appScreen").style.display = "none";
    document.getElementById("congratsScreen").style.display = "block";
    document.getElementById("congratsMessage").innerText = m;
}
