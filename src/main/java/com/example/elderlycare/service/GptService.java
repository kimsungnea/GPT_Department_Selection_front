package com.example.elderlycare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GptService {

    @Value("${openai.api.key}")
    private String openaiApiKey;

    @Value("${openai.api.url}")
    private String openaiApiUrl;

    //RestTemplate: GPT API에 요청 보내는 도구
    private final RestTemplate restTemplate = new RestTemplate();
    //ObjectMapper: JSON 파싱해서 원하는 데이터 추출하는 도구
    private final ObjectMapper objectMapper = new ObjectMapper();


    private static final List<String> validDepartments = List.of(
            "내과", "외과", "정형외과", "신경외과", "신경과", "정신건강의학과",
            "피부과", "이비인후과", "안과", "치과", "비뇨기과", "산부인과",
            "소아청소년과", "재활의학과", "마취통증의학과", "흉부외과", "성형외과",
            "가정의학과", "한방내과"
    );

    public Map<String, String> analyzeSymptomsAndGetResult(String symptom) {
        Map<String, String> result = new HashMap<>();

        try {
            // 1차 GPT 호출: 진료과 추천
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "gpt-4");
            requestBody.put("temperature", 0.4);
            requestBody.put("max_tokens", 20);
            requestBody.put("messages", List.of(
                    Map.of("role", "system", "content",
                            "당신은 의료 전문가입니다. 사용자의 증상에 대해 다음 진료과 중 하나만 답변하세요:\n" +
                                    String.join(", ", validDepartments) +
                                    "\n설명 없이 진료과 이름만 출력하세요. 증상과 관련 없다면 'Error'만 출력하세요."),
                    Map.of("role", "user", "content", "음성인식: " + symptom)
            ));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.exchange(openaiApiUrl, HttpMethod.POST, request, String.class);

            String department = objectMapper.readTree(response.getBody())
                    .path("choices").get(0).path("message").path("content").asText().trim();
            // GPT가 의도치 않게 공백, 마침표, 콜론, 괄호 등을 포함할 수 있기 때문에 → 이를 강제적으로 “한글만 추출”해서 진료과만 남기려는 방어 로직
            department = department.replaceAll("[^가-힣]", "");

            if (!validDepartments.contains(department)) {
                log.warn("GPT가 예상치 못한 진료과를 반환했습니다: {} → Error 처리", department);
                result.put("department", "Error");
                return result;
            }

            // 2차 GPT 호출: 이유(reason)
            Map<String, Object> reasonRequestBody = new HashMap<>();
            reasonRequestBody.put("model", "gpt-4");
            reasonRequestBody.put("temperature", 0.4);
            reasonRequestBody.put("max_tokens", 80);
            reasonRequestBody.put("messages", List.of(
                    Map.of("role", "system", "content",
                            "사용자의 증상에 대해 해당 진료과를 추천하는 이유를 1문장으로 설명하세요." +
                                "추천하는 이유만 작성, 즉 '이유:', ':' 이런거 넣지마세요."),
                    Map.of("role", "user", "content", "증상: " + symptom)
            ));

            HttpEntity<Map<String, Object>> reasonRequest = new HttpEntity<>(reasonRequestBody, headers);
            ResponseEntity<String> reasonResponse = restTemplate.exchange(openaiApiUrl, HttpMethod.POST, reasonRequest, String.class);

            String reason = objectMapper.readTree(reasonResponse.getBody())
                    .path("choices").get(0).path("message").path("content").asText().trim();

            log.info("GPT 분석 결과 - 음성인식: {}, 증상: {}, 추천 진료과: {}", symptom, reason, department);
            result.put("department", department);
            result.put("reason", reason);
            return result;

        } catch (Exception e) {
            log.error("GPT API 호출 실패", e);
            result.put("department", "Error");
            return result;
        }
    }
}