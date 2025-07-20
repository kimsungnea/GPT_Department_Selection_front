package com.example.elderlycare.controller;

import com.example.elderlycare.dto.HospitalInfo;
import com.example.elderlycare.dto.SymptomRequest;
import com.example.elderlycare.dto.SymptomResponse;
import com.example.elderlycare.service.GptService;
import com.example.elderlycare.service.KakaoMapService;
import com.example.elderlycare.service.HospitalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HospitalController {

    private final GptService gptService;
    private final KakaoMapService kakaoMapService;
    private final HospitalService hospitalService;

    @PostMapping("/analyze-symptom")
    public ResponseEntity<Map<String, String>> analyzeSymptom(@RequestBody Map<String, String> request) {
        String symptom = request.get("symptom");
        Map<String, String> result = gptService.analyzeSymptomsAndGetResult(symptom);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/search-hospitals")
    public ResponseEntity<List<HospitalInfo>> searchHospitals(
            @RequestParam String department,
            @RequestParam double lat,
            @RequestParam double lng) {

        // 1) 카카오맵을 통해 병원 리스트 검색
        List<HospitalInfo> hospitals = kakaoMapService.searchNearbyHospitals(department, lat, lng);

        // 2) 각 병원에 구글 Places API로 영업시간을 매핑
        for (HospitalInfo h : hospitals) {
            try {
                String openingHours = hospitalService.fetchOpeningHours(h.getPlaceName());
                h.setOpeningHours(openingHours);
            } catch (Exception e) {
                e.printStackTrace();
                h.setOpeningHours("영업시간 정보 없음");
            }
        }

        return ResponseEntity.ok(hospitals);
    }
}
