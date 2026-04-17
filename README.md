<p align="center">
  <img src="./public/branding/algorithmhub-wordmark.svg" alt="AlgorithmHub" width="520" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"/></a>
  <a href="https://github.com/dev-minsoo/AlgorithmHub/releases"><img src="https://img.shields.io/github/v/release/dev-minsoo/AlgorithmHub?display_name=tag" alt="release"/></a>
</p>

<p align="center">
  <strong>LeetCode</strong>와 <strong>프로그래머스</strong>의 정답 제출 코드를
  GitHub으로 자동 동기화하는 Chrome 확장 프로그램입니다.
</p>

<p align="center">
  <a href="./README.en.md">English</a>
  ·
  <a href="https://github.com/dev-minsoo/AlgorithmHub/issues">이슈 제보</a>
</p>

## AlgorithmHub란?

AlgorithmHub는 코딩 테스트 문제를 푼 뒤, 정답 제출 코드를 직접 정리해서
GitHub에 옮기는 과정을 줄여 주는 Chrome 확장 프로그램입니다.

GitHub 저장소를 연결해두면 아래 플랫폼의 정답 제출을 자동으로 동기화합니다.

- LeetCode
- 프로그래머스

## 주요 특징

- 정답 제출 코드를 GitHub으로 자동 업로드
- LeetCode와 프로그래머스를 하나의 확장에서 지원
- 새 저장소 생성 또는 기존 저장소 연결
- 플랫폼별 저장 경로 템플릿 커스터마이징
- 플랫폼 기준 요약이 포함된 깔끔한 루트 README 유지

## AlgorithmHub는 어떻게 동작하나요?

1. GitHub 계정과 저장소를 연결합니다
2. LeetCode 또는 프로그래머스에서 문제를 풉니다
3. 정답 제출을 합니다
4. AlgorithmHub가 풀이 파일을 GitHub으로 자동 동기화합니다

| LeetCode 데모 | 프로그래머스 데모 |
| --- | --- |
| ![LeetCode demo](./docs/leetcode-demo.gif) | ![Programmers demo](./docs/programmers-demo.gif) |

## 사용 방법

1. 확장 팝업을 연다
2. GitHub 인증을 진행한다
3. 새 저장소를 만들거나 기존 저장소를 연결한다
4. LeetCode 또는 프로그래머스에서 문제를 푼다
5. 정답 제출을 한다
6. AlgorithmHub가 결과를 GitHub으로 동기화한다

## 로컬 개발 환경 설정

```bash
npm install
npm run build
npm run lint
```

그 다음 Chrome에서:

1. `chrome://extensions`를 연다
2. `개발자 모드`를 켠다
3. `압축해제된 확장 프로그램을 로드합니다`를 클릭한다
4. `dist/` 디렉토리를 선택한다

## 기여하기

AlgorithmHub는 오픈소스 프로젝트이며, 기여를 환영합니다.

버그 제보, 기능 제안, 코드 개선 PR 모두 환영합니다.

### 이슈 작성 가이드

- 규모가 있는 변경이라면 먼저 이슈를 만들어 주세요
- 이슈 제목에는 아래 prefix를 사용해 주세요
  - `bug:` 버그 제보
  - `feat:` 기능 제안
- 가능하면 재현 방법, 기대 동작, 스크린샷을 함께 적어 주세요

### PR 가이드

1. 저장소를 fork합니다
2. 작업 브랜치를 만듭니다
3. 변경 사항을 반영합니다
4. `npm run lint`, `npm run build`를 실행합니다
5. 변경 내용을 설명하는 PR을 생성합니다
6. 관련 이슈가 있다면 함께 연결해 주세요

PR 제목에는 아래 prefix를 사용해 주세요.

- `fix:` 버그 수정
- `feat:` 기능 추가
- `chore:` 유지보수, 정리, 비기능 변경

## 이슈 제보

버그 제보나 기능 요청은 아래 이슈 페이지로 남기면 됩니다.

- https://github.com/dev-minsoo/AlgorithmHub/issues

## Inspired by

- [BaekjoonHub](https://github.com/BaekjoonHub/BaekjoonHub)
- [LeetHub](https://github.com/QasimWani/LeetHub)
