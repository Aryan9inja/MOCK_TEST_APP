# AI Development Rules

These rules are mandatory.

---

# General Principles

Write production-quality code.

Prefer maintainability over cleverness.

Always assume another engineer will maintain the project.

---

# Architecture

Follow Clean Architecture.

Separate

- handlers
- controllers
- services
- repositories
- database
- models
- middleware
- configuration
- utilities

Never place everything inside main.go.

Never place everything inside App.tsx.

---

# Functions

One function solves one problem.

Target

20–40 lines.

If a function becomes large

Refactor.

---

# Files

Avoid files larger than ~300 lines.

Split by responsibility.

Example

compiler/

cpp.go

python.go

runner.go

sql/

executor.go

schema.go

validator.go

---

# Packages

Create packages based on features.

NOT based on file types.

Bad

utils/

Good

compiler/

timer/

question/

runner/

submission/

---

# Naming

Use meaningful names.

Avoid

data

temp

manager2

Do not abbreviate unnecessarily.

---

# Error Handling

Never ignore errors.

Return informative errors.

Wrap errors with context.

---

# Logging

Structured logging.

No random fmt.Println debugging.

---

# SQL

Always use

sqlc

Never write SQL strings inside Go code.

Use goose migrations.

Queries belong inside sqlc query files.

---

# Database

Schema changes

↓

Goose migration

↓

sqlc generate

↓

Compile

No exceptions.

---

# Tests

Unit testing is mandatory.

Every service

Every repository

Every parser

Every compiler wrapper

must have tests.

New code should include tests.

---

# Frontend

Reusable components.

No duplicated JSX.

Separate

pages

components

hooks

services

types

---

# React

Prefer hooks.

Avoid prop drilling.

Create reusable hooks.

---

# State

Keep local state local.

Do not introduce global state unless necessary.

---

# Styling

Tailwind only.

Avoid inline styles.

---

# Backend

Dependency injection where appropriate.

Avoid global mutable state.

Interfaces only when useful.

Do not over-engineer.

---

# API

REST for MVP.

Consistent response format.

Example

{
success,
data,
error
}

---

# JSON

Questions should be fully data-driven.

Backend should not hardcode questions.

---

# Security

Never execute arbitrary shell commands.

Whitelist

g++

python3

psql

only.

Always sanitize file paths.

---

# Performance

Compile once.

Run many tests.

Reuse database connections.

Avoid unnecessary allocations.

---

# Comments

Explain WHY.

Do not explain WHAT.

Good code should already explain WHAT.

---

# Git

Small commits.

Meaningful commit messages.

---

# Goal

Build software that can grow for years without major rewrites.

Every design decision should favor extensibility, readability, and testability.
