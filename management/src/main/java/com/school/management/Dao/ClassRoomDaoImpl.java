package com.school.management.Dao;

import com.school.management.entity.ClassRoom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public class ClassRoomDaoImpl implements ClassRoomDao {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<ClassRoom> findAll() {
        return em.createQuery(
                "SELECT c FROM ClassRoom c ORDER BY c.grade ASC, c.section ASC, c.name ASC",
                ClassRoom.class
        ).getResultList();
    }

    @Override
    public Optional<ClassRoom> findById(Long id) {
        return Optional.ofNullable(em.find(ClassRoom.class, id));
    }

    @Override
    public List<ClassRoom> findByGrade(String grade) {
        return em.createQuery(
                "SELECT c FROM ClassRoom c WHERE c.grade = :grade",
                ClassRoom.class
        )
        .setParameter("grade", grade)
        .getResultList();
    }

    @Override
    @Transactional
    public ClassRoom save(ClassRoom classRoom) {
        return classRoom.getId() == null
                ? persist(classRoom)
                : em.merge(classRoom);
    }

    private ClassRoom persist(ClassRoom c) {
        em.persist(c);
        return c;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ClassRoom c = em.find(ClassRoom.class, id);

        if (c != null) {
            em.remove(c);
        }
    }
}
