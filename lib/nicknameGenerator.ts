export const ADJECTIVES = [
    "배고픈", "신나는", "행복한", "졸린", "용감한", "똑똑한", "친절한", "조용한", "활기찬", "궁금한",
    "즐거운", "멋진", "귀여운", "상냥한", "차분한", "따뜻한", "시원한", "푸른", "붉은", "노란",
    "빛나는", "빠른", "느린", "높은", "깊은", "넓은", "좁은", "강한", "약한", "부드러운",
    "거친", "매끄러운", "단단한", "무거운", "가벼운", "어두운", "밝은", "새로운", "오래된", "젊은",
    "늙은", "작은", "큰", "긴", "짧은", "맑은", "흐린", "비오는", "눈오는", "바람부는"
];

export const NOUNS = [
    "호랑이", "사자", "토끼", "거북이", "독수리", "참새", "고양이", "강아지", "코끼리", "기린",
    "원숭이", "펭귄", "판다", "나무 늘보", "다람쥐", "오리", "거위", "백조", "고래", "상어",
    "돌고래", "물고기", "개구리", "뱀", "도마뱀", "악어", "공룡", "용", "유니콘", "페가수스",
    "별", "달", "해", "구름", "비", "눈", "바람", "번개", "천둥", "무지개",
    "산", "바다", "강", "호수", "숲", "들판", "사막", "동굴", "섬", "도시"
];

export function generateRandomNickname(): string {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    // Add a random number suffix to reduce collision probability
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${adjective} ${noun} ${suffix}`;
}

export function generateNicknameWithoutNumber(): string {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adjective} ${noun}`;
}
