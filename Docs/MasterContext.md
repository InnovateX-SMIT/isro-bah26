# Bharatiya Antariksh Hackathon 2026

# MASTER CONTEXT DOCUMENT

Version: 1.0

Status: Foundation Draft

Last Updated: Architecture Discussion Phase

---

# Project Information

## Hackathon

Bharatiya Antariksh Hackathon 2026

## Problem Statement

Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery

## Core Objective

Develop an AI-powered geospatial reconstruction platform capable of processing cloud-covered LISS-IV satellite imagery and generating cloud-free, analysis-ready outputs while preserving spatial structures, terrain characteristics, vegetation patterns, water bodies, infrastructure, and other critical geospatial information.

---

# Project Vision

This project is not being developed as a simple cloud-removal application.

The goal is to build an AI-Powered Geospatial Reconstruction Platform that combines:

* Satellite imagery
* Geospatial metadata
* Historical references
* Temporal intelligence
* Artificial Intelligence
* Confidence estimation

into a unified operational workflow.

The platform should resemble a professional mission-control system rather than a typical student project or AI demo.

---

# Product Positioning

The project shall be positioned as:

AI-Powered Geospatial Reconstruction Platform

The project shall NOT be positioned as:

* Cloud Removal Tool
* Image Editing Tool
* AI Image Generator
* GIS Viewer

Cloud removal is only one subsystem of the overall platform.

---

# Architectural Philosophy

The architecture follows:

Platform First
Model Second

The AI model is a component of the platform.

The platform itself is the product.

Success will be determined by the complete workflow rather than solely by reconstruction quality.

---

# Core Worlds

The system is divided into three logical worlds.

## World 1 — Geospatial Intelligence

Responsible for:

* Metadata extraction
* Coordinate extraction
* Projection handling
* Dataset understanding
* Historical imagery discovery
* Geospatial visualization
* Mapping services

---

## World 2 — AI Intelligence

Responsible for:

* Cloud detection
* Cloud segmentation
* Cloud mask generation
* Image reconstruction
* Temporal fusion
* Confidence estimation
* Analysis generation

---

## World 3 — Product Intelligence

Responsible for:

* User experience
* Dashboard
* Visualization
* Reporting
* Export systems
* Presentation workflow
* Operational interfaces

---

# Fundamental Principles

## Principle 1

The uploaded dataset is the source of truth.

No assumptions shall be made regarding:

* Bands
* Metadata structure
* Projection system
* Resolution
* Coordinate system

All information must be discovered dynamically.

---

## Principle 2

Historical context is a first-class citizen.

The reconstruction process should leverage:

* Current imagery
* Historical imagery
* Temporal intelligence

whenever available.

---

## Principle 3

The platform must remain functional even if historical references are unavailable.

Historical references enhance reconstruction quality but should not be a hard dependency.

---

## Principle 4

The system shall prioritize explainability.

Every reconstruction should be accompanied by supporting information and visual evidence.

---

# User Workflow

## Step 1

Landing Page

---

## Step 2

Dataset Selection

User can either:

* Select built-in demo dataset
* Upload custom dataset

---

## Step 3

Dataset Validation

Platform validates:

* File format
* Metadata
* Dataset integrity

---

## Step 4

Metadata Intelligence

Platform extracts:

* Coordinates
* Acquisition information
* Sensor details
* Band information
* Projection information

---

## Step 5

Map Intelligence

Platform generates:

* Location visualization
* Map preview
* Spatial reference context

---

## Step 6

Historical Intelligence

Platform discovers:

* Historical references
* Temporal imagery
* Supporting geospatial context

---

## Step 7

Cloud Intelligence

Platform performs:

* Cloud detection
* Cloud segmentation
* Cloud mask generation

---

## Step 8

Reconstruction Intelligence

Platform performs:

* Reconstruction
* Inpainting
* Temporal reconstruction
* Spatial consistency generation

---

## Step 9

Confidence Intelligence

Platform generates:

* Confidence maps
* Confidence scores
* Reconstruction reliability indicators

---

## Step 10

Visualization

Platform displays:

* Original image
* Cloud mask
* Reconstructed image
* Confidence heatmap

---

## Step 11

Dashboard

Platform presents:

* Analysis
* Metadata
* Statistics
* Operational information

---

## Step 12

Export

Platform exports:

* GeoTIFF
* Images
* Reports
* Analysis outputs

---

# Processing Experience

The system should never present a generic loading screen.

The system should present operational progress.

Examples:

✓ Dataset Validated

✓ Metadata Extracted

✓ Coordinates Identified

✓ Historical References Retrieved

✓ Cloud Detection Complete

✓ Reconstruction Running

✓ Confidence Analysis Running

---

# User Interface Philosophy

Mission Control Style

The platform should resemble:

* Operational software
* Government systems
* Scientific systems
* Satellite intelligence systems

The platform should not resemble:

* Generic dashboards
* Student projects
* Basic AI demos

---

# Dashboard Philosophy

Dashboard development is dependent upon data generation.

The dashboard is not an independent feature.

The dashboard consumes outputs generated by:

* Metadata systems
* Cloud systems
* Reconstruction systems
* Confidence systems
* Export systems

Dashboard development should therefore occur after core pipeline implementation.

---

# Dataset Philosophy

The platform shall support:

## Demo Datasets

Used for:

* Demonstrations
* Testing
* Presentations
* Judging

## User Uploaded Datasets

Used for:

* Real-world analysis
* Validation
* Platform flexibility

Both modes are mandatory.

---

# Current Technology Direction

Frontend

* Next.js
* TypeScript
* TailwindCSS
* shadcn/ui
* MapLibre

Backend

* FastAPI
* Python

AI

* PyTorch
* OpenCV
* NumPy
* Albumentations

Geospatial

* Rasterio
* GDAL
* PyProj

Storage

* SQLite (current direction)
* PostgreSQL/PostGIS (future evaluation)

---

# Current Strategic Direction

The project aims to win by:

* Strong architecture
* Operational workflow
* Explainability
* Geospatial intelligence
* Temporal intelligence
* Professional presentation

rather than competing solely on model complexity.

---

# Living Document Notice

This document is a living document.

Future discoveries involving:

* Dataset structure
* ISRO guidance
* Technical limitations
* Research findings

may modify sections of this document.

All modifications must preserve the project's core vision and architectural philosophy.
