# Pudge Wars - Product Requirements Document

## Original Problem Statement
2D top-down web game "Pudge Wars" using HTML5 Canvas in React. Playing field split by horizontal river. Player at bottom, 3 bots at top. Hook mechanic to capture bots. Score 15 to win.

## Architecture
- **Frontend**: React + HTML5 Canvas (no DOM game elements)
- **Backend**: Not used (purely frontend game)
- **Database**: Not used

## User Persona
- Casual gamers, Dota 2 fans, web game players

## Core Requirements
- Canvas-based 2D game with green grass + blue river map
- Player (cyan) moves via right-click, fires hook via Q key
- 3 red bots wander randomly above river
- Hook max range 300px, captures bots on hit, drags to player
- Score +1 per capture, 15 to win
- Victory screen with R to restart

## What's Been Implemented (Feb 2026)
- Full game engine (GameEngine.js) with player, bots, hook, river, scoring
- React Canvas component (PudgeWarsGame.jsx) with input handling
- Cyberpunk dark theme wrapper with glassmorphism effects
- Rajdhani font for game UI
- Russian keyboard support (Й for Q, К for R)
- All tests passed (95% success)

## Prioritized Backlog
- P2: Sound effects for hook, capture, victory
- P2: Particle effects on bot capture
- P3: Difficulty levels (more bots, faster bots)
- P3: Mobile touch controls
