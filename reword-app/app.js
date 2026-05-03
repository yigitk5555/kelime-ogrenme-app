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

// 📌 TEMA YÖNETİMİ
window.toggleTheme = function() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    document.getElementById("themeBtn").innerText = isLight ? "☀️ Açık Tema" : "🌙 Koyu Tema";
};

// 📌 İSTATİSTİK GÜNCELLEME
function updateStats() {
    document.getElementById("todayCount").innerText = dailyCount;
    let total = 0;
    ["A1", "A2", "B1", "B2", "C1"].forEach(lvl => {
        const saved = localStorage.getItem(`known_${lvl}`);
        if (saved) total += JSON.parse(saved).length;
    });
    document.getElementById("totalKnownCount").innerText = total;
}

// 📌 SEVİYE SEÇİMİ
window.selectLevel = async function(level) {
    currentLevel = level;
    isStudyMode = false;
    try {
        const response = await fetch(`./${level}.json`);
        if (!response.ok) throw new Error("Dosya bulunamadı");
        const allWords = await response.json();
        totalLevelWords = allWords.length;
        
        const savedKnown = localStorage.getItem(`known_${level}`);
        knownWords = savedKnown ? JSON.parse(savedKnown) : [];
        
        activeWords = allWords.filter(w => !knownWords.some(k => k.word === w.word));
        
        if (activeWords.length === 0) {
            showCongrats(level + " seviyesini bitirmişsin!");
            return;
        }
        startApp();
    } catch (e) { 
        alert("Hata: " + level + ".json yüklenemedi. Dosya adını kontrol et."); 
    }
};

function startApp() {
    document.getElementById("levelScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";
    document.getElementById("congratsScreen").style.display = "none";
    nextWord();
}

// 📌 KELİME GEÇİŞLERİ
window.nextWord = function() {
    if (activeWords.length === 0) {
        const msg = isStudyMode ? "Zorlandığın kelimeleri temizledin! 🎉" : "Bölüm tamamlandı! 🎉";
        showCongrats(msg);
        return;
    }

    const randomIndex = Math.floor(Math.random() * activeWords.length);
    currentWord = activeWords[randomIndex];

    document.getElementById("word").innerText = currentWord.word;
    document.getElementById("infoBox").style.display = "none";
    document.getElementById("mainButtons").style.display = "flex";
    
    updateProgressBar();
};

// 📌 CEVAPLAMA MANTIĞI
window.answer = async function(knows) {
    if (!currentWord) return;

    if (knows) {
        dailyCount++;
        localStorage.setItem('dailyCount', dailyCount);
        
        if (!isStudyMode) {
            knownWords.push(currentWord);
            localStorage.setItem(`known_${currentLevel}`, JSON.stringify(knownWords));
        }
        
        // Hata listesinden çıkar
        let missed = JSON.parse(localStorage.getItem('missed_words')) || [];
        missed = missed.filter(m => m.word !== currentWord.word);
        localStorage.setItem('missed_words', JSON.stringify(missed));

        activeWords = activeWords.filter(w => w.word !== currentWord.word);
        updateStats();
        nextWord();
    } else {
        // Bilmiyorum: Hata listesine ekle
        let missed = JSON.parse(localStorage.getItem('missed_words')) || [];
        if (!missed.some(m => m.word === currentWord.word)) {
            missed.push(currentWord);
            localStorage.setItem('missed_words', JSON.stringify(missed));
        }
        showDetails();
    }
    checkMissedWords();
};

// 📌 DETAYLARI GÖSTER (API İLE CÜMLE ÇEKER)
async function showDetails() {
    document.getElementById("mainButtons").style.display = "none";
    document.getElementById("meaning").innerText = currentWord.meaning;
    const list = document.getElementById("examples");
    list.innerHTML = "<li>Cümle aranıyor...</li>";
    
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${currentWord.word}`);
        const data = await res.json();
        let exHtml = "";
        
        if (data && data[0]) {
            data[0].meanings.forEach(m => {
                m.definitions.forEach(d => {
                    if (d.example) exHtml += `<li>${d.example}</li>`;
                });
            });
        }
        
        list.innerHTML = exHtml || "<li>Örnek cümle bulunamadı.</li>";
    } catch (e) { 
        list.innerHTML = "<li>Örnek cümle şu an yüklenemedi.</li>"; 
    }
    
    document.getElementById("infoBox").style.display = "block";
}

// 📌 SESLİ TELAFFUZ
window.speakWord = function() {
    if (!currentWord) return;
    const ut = new SpeechSynthesisUtterance(currentWord.word);
    ut.lang = 'en-US';
    window.speechSynthesis.speak(ut);
};

// 📌 YARDIMCI FONKSİYONLAR
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

window.goToMainMenu = function() {
    document.getElementById("appScreen").style.display = "none";
    document.getElementById("congratsScreen").style.display = "none";
    document.getElementById("levelScreen").style.display = "block";
    checkMissedWords();
};

function showCongrats(m) {
    document.getElementById("appScreen").style.display = "none";
    document.getElementById("congratsScreen").style.display = "block";
    document.getElementById("congratsMessage").innerText = m;
}