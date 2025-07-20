package com.example.elderlycare.dto;

import lombok.Data;

@Data
public class HospitalInfo {
    private String placeName;
    private String addressName;
    private String phone;
    private String distance;
    private double x;
    private double y;
    private String placeUrl;
    private String openingHours;
}