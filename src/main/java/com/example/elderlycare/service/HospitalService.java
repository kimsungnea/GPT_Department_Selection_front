package com.example.elderlycare.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

@Service
public class HospitalService {

    @Value("${google.api-key}")
    private String apiKey;

    public String fetchOpeningHours(String hospitalName) {
        System.out.println("===== 구글 영업시간 조회 시작 =====");
        System.out.println("요청 병원명: " + hospitalName);

        // 한글 인코딩
        String encodedQuery = hospitalName.replace(" ", "%20");

        // 1) findplacefromtext
        String searchUrl = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
                + "?input=" + encodedQuery
                + "&inputtype=textquery"
                + "&fields=place_id"
                + "&key=" + apiKey;

        System.out.println("구글 FindPlace URL: " + searchUrl);

        RestTemplate restTemplate = new RestTemplate();
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(searchUrl, Map.class);
            Map<String, Object> body = response.getBody();
            System.out.println("FindPlace 응답: " + body);

            if (body == null || !body.containsKey("candidates")) {
                System.out.println("candidates 없음");
                return null;
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
            if (candidates.isEmpty()) {
                System.out.println("candidates 비어있음");
                return null;
            }

            String placeId = (String) candidates.get(0).get("place_id");
            System.out.println("추출된 placeId: " + placeId);

            if (placeId == null) {
                System.out.println("placeId 가 null임");
                return null;
            }

            // 2) place details 조회
            String detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json"
                    + "?place_id=" + placeId
                    + "&fields=opening_hours"
                    + "&key=" + apiKey;

            System.out.println("구글 Details URL: " + detailsUrl);

            ResponseEntity<Map> detailsResponse = restTemplate.getForEntity(detailsUrl, Map.class);
            Map<String, Object> detailsBody = detailsResponse.getBody();
            System.out.println("Details 응답: " + detailsBody);

            if (detailsBody == null || !detailsBody.containsKey("result")) {
                System.out.println("Details result 없음");
                return null;
            }

            Map<String, Object> result = (Map<String, Object>) detailsBody.get("result");
            if (result != null && result.containsKey("opening_hours")) {
                Map<String, Object> opening = (Map<String, Object>) result.get("opening_hours");
                List<String> weekdayText = (List<String>) opening.get("weekday_text");
                System.out.println("weekday_text: " + weekdayText);

                if (weekdayText != null && !weekdayText.isEmpty()) {
                    return String.join(" / ", weekdayText);
                } else {
                    System.out.println("weekday_text 비어있음");
                }
            } else {
                System.out.println("opening_hours 정보 없음");
            }

        } catch (Exception e) {
            System.out.println("구글 API 요청 중 예외 발생");
            e.printStackTrace();
        }

        System.out.println("===== 구글 영업시간 조회 종료 (결과 없음) =====");
        return null;
    }
}
