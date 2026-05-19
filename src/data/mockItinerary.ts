export type Transport = {
  mode: string;
  duration: string;
  cost?: string;
};

export type Coords = { lat: number; lng: number };

export type ItineraryItem = {
  time: string;
  place: string;
  description: string;
  category: "food" | "activity" | "culture" | "nature" | "shopping" | "healing";
  duration: string;
  cost?: string;
  transport?: Transport;
  coords?: Coords;
};

export type DayPlan = {
  dayLabel: string;
  date: string;
  items: ItineraryItem[];
};

export type MockItinerary = {
  destination: string;
  duration: string;
  days: DayPlan[];
  totalEstimate?: string;
};

export const mockItinerary: MockItinerary = {
  destination: "도쿄",
  duration: "1박 2일",
  days: [
    {
      dayLabel: "Day 1",
      date: "첫째 날",
      items: [
        {
          time: "09:00",
          place: "아사쿠사 센소지",
          description: "도쿄에서 가장 오래된 사원. 나카미세 거리에서 전통 과자와 기념품 쇼핑 추천.",
          category: "culture",
          duration: "1시간 30분",
        },
        {
          time: "11:00",
          place: "우에노 공원",
          description: "넓은 공원에서 여유로운 산책. 봄에는 벚꽃 명소로 유명.",
          category: "nature",
          duration: "1시간",
        },
        {
          time: "12:30",
          place: "이치란 라멘 (우에노점)",
          description: "1인 칸막이 좌석에서 즐기는 진한 돈코츠 라멘. 도쿄 대표 맛집.",
          category: "food",
          duration: "1시간",
        },
        {
          time: "14:00",
          place: "아키하바라",
          description: "전자제품과 애니메이션 굿즈의 성지. 빈티지 게임 아이템도 발견 가능.",
          category: "shopping",
          duration: "2시간",
        },
        {
          time: "17:00",
          place: "도쿄 스카이트리",
          description: "지상 350m 전망대에서 도쿄 전경 감상. 해 질 무렵 방문 강추.",
          category: "activity",
          duration: "1시간 30분",
        },
        {
          time: "19:30",
          place: "스미다 리버 워크",
          description: "스카이트리 야경을 배경으로 한 강변 산책. 포토스팟 다수.",
          category: "healing",
          duration: "1시간",
        },
        {
          time: "21:00",
          place: "이자카야 긴자 타누키",
          description: "정통 일본 이자카야에서 야키토리와 생맥주로 하루 마무리.",
          category: "food",
          duration: "1시간 30분",
        },
      ],
    },
    {
      dayLabel: "Day 2",
      date: "둘째 날",
      items: [
        {
          time: "08:30",
          place: "츠키지 장외시장",
          description: "신선한 해산물 아침 식사. 생참치 덮밥과 계란말이가 유명.",
          category: "food",
          duration: "1시간 30분",
        },
        {
          time: "10:30",
          place: "하마리큐 정원",
          description: "도심 속 전통 일본 정원. 다실에서 말차와 화과자 체험 가능.",
          category: "healing",
          duration: "1시간",
        },
        {
          time: "12:00",
          place: "긴자 식스",
          description: "럭셔리 쇼핑몰에서 쇼핑과 루프탑 정원 산책. 갤러리도 무료 관람.",
          category: "shopping",
          duration: "1시간 30분",
        },
        {
          time: "14:00",
          place: "시부야 스크램블 교차로",
          description: "세계 최대 규모 교차로. 스타벅스 2층에서 내려다보는 뷰 추천.",
          category: "activity",
          duration: "1시간",
        },
        {
          time: "15:30",
          place: "오모테산도 힐즈",
          description: "세련된 갤러리아 형식의 쇼핑몰. 유명 디자이너 브랜드 집결.",
          category: "shopping",
          duration: "1시간 30분",
        },
        {
          time: "18:00",
          place: "신주쿠 황금가",
          description: "오래된 골목길의 소규모 바들. 현지인 분위기를 느낄 수 있는 숨은 명소.",
          category: "culture",
          duration: "2시간",
        },
        {
          time: "20:30",
          place: "도쿄역 라멘 스트리트",
          description: "도쿄역 지하에 위치한 전국 유명 라멘 8개점 모음. 귀국 전 마지막 만찬.",
          category: "food",
          duration: "1시간",
        },
      ],
    },
  ],
};
