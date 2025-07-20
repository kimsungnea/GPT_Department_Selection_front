package com.example.elderlycare.service;

import com.example.elderlycare.dto.HospitalInfo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class KakaoMapService {

    @Value("${kakao.api.key}")
    private String kakaoApiKey;

    @Value("${kakao.api.url}")
    private String kakaoApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<HospitalInfo> searchNearbyHospitals(String department, double lat, double lng) {
        List<HospitalInfo> allHospitals = new ArrayList<>();

        allHospitals.addAll(searchWithKeyword(department + "병원", lat, lng));

        if (allHospitals.size() < 5) {
            allHospitals.addAll(searchWithKeyword(department + "의원", lat, lng));
        }

        return allHospitals.stream().limit(10).toList();
    }

    private List<HospitalInfo> searchWithKeyword(String keyword, double lat, double lng) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoApiKey);

            String url = UriComponentsBuilder.fromHttpUrl(kakaoApiUrl)
                    .queryParam("query", keyword)
                    .queryParam("x", lng)
                    .queryParam("y", lat)
                    .queryParam("radius", 5000)
                    .queryParam("sort", "distance")
                    .queryParam("size", 15)
                    .build()
                    .toUriString();

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode documents = root.path("documents");

            List<HospitalInfo> hospitals = new ArrayList<>();
            for (JsonNode doc : documents) {
                HospitalInfo hospital = new HospitalInfo();
                hospital.setPlaceName(doc.path("place_name").asText());
                hospital.setAddressName(doc.path("address_name").asText());
                hospital.setPhone(doc.path("phone").asText(""));
                hospital.setDistance(doc.path("distance").asText("0"));
                hospital.setX(doc.path("x").asDouble());
                hospital.setY(doc.path("y").asDouble());
                hospital.setPlaceUrl(doc.path("place_url").asText());
                hospitals.add(hospital);
            }

            log.info("카카오맵 검색 결과 - 키워드: {}, 결과 수: {}", keyword, hospitals.size());
            return hospitals;

        } catch (Exception e) {
            log.error("카카오 API 호출 실패", e);
            return new ArrayList<>();
        }
    }
}
